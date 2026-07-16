#!/usr/bin/env python3
"""
EveryPlan Data Pipeline v2.0
Template-guided PDF parsing with table detection, encoding cleanup,
and MMA municipal data integration.

Architecture:
  1. Try native PDF TOC for section boundaries
  2. Match headings against plan-type template (OSRP workbook structure)
  3. Fall back to tightened heuristic heading detection
  4. Detect and exclude table regions
  5. Clean encoding artifacts, merge tiny sections, deduplicate
  6. Extract recommendations, data sources, consultant info
  7. Import MMA municipal data
  8. Build SQLite + JSON output
"""

import fitz  # PyMuPDF
import csv
import json
import os
import re
import sqlite3
import hashlib
import sys
import unicodedata
from pathlib import Path
from difflib import SequenceMatcher

# ── Configuration ──────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = DATA_DIR / "output"
PLANS_OUTPUT_DIR = OUTPUT_DIR / "plans"
DB_PATH = OUTPUT_DIR / "everyplan.db"
TEMPLATES_DIR = SCRIPT_DIR / "templates"
MMA_CSV_PATH = SCRIPT_DIR / "mma_data.csv"

# PDF source directory
PDF_DIR_OPTIONS = [
    Path("/Users/stephenlarrick/Desktop/NSPC_OSRPs"),
    DATA_DIR / "pdfs",
    PROJECT_ROOT / "plans" / "HPPs",
]

# ── Plan Metadata ──────────────────────────────────────────────────────────

PLAN_METADATA = {
    "reading-osrp-2022": {
        "plan_name": "Open Space & Recreation Plan 2022-2029",
        "municipality": "Reading",
        "plan_type": "open_space_recreation",
        "year_adopted": 2022,
        "adoption_status": "adopted",
        "pdf_filename": "230208_ReadingOSRP2022-2029_wApp.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "burlington-osrp-2019": {
        "plan_name": "Open Space and Recreation Plan",
        "municipality": "Burlington",
        "plan_type": "open_space_recreation",
        "year_adopted": 2019,
        "adoption_status": "adopted",
        "pdf_filename": "Burlington_2019 Open Space and Recreation Plan (PDF).pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "lynnfield-osrp-2020": {
        "plan_name": "Open Space and Recreation Plan",
        "municipality": "Lynnfield",
        "plan_type": "open_space_recreation",
        "year_adopted": 2020,
        "adoption_status": "adopted",
        "pdf_filename": "Lynnfield_Complete the 2020 Open Space and Recreation Plan (PDF).pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "north-reading-osrp-2025": {
        "plan_name": "Updated Open Space & Recreation Plan 2025",
        "municipality": "North Reading",
        "plan_type": "open_space_recreation",
        "year_adopted": 2025,
        "adoption_status": "adopted",
        "pdf_filename": "North-Reading_Updated OSRP 2025 all appendices.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "stoneham-osrp": {
        "plan_name": "Open Space and Recreation Plan",
        "municipality": "Stoneham",
        "plan_type": "open_space_recreation",
        "year_adopted": None,
        "adoption_status": "unknown",
        "pdf_filename": "Stoneham_Open Space and Recreation Plan (PDF).pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "wakefield-osrp-2025": {
        "plan_name": "Open Space Plan 2025",
        "municipality": "Wakefield",
        "plan_type": "open_space_recreation",
        "year_adopted": 2025,
        "adoption_status": "adopted",
        "pdf_filename": "Wakefield_open-space-plan-2025-08_2025080811201551.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "wilmington-osrp-2022": {
        "plan_name": "Open Space & Recreation Plan (Revised)",
        "municipality": "Wilmington",
        "plan_type": "open_space_recreation",
        "year_adopted": 2022,
        "adoption_status": "adopted",
        "pdf_filename": "final_wilmington_osrp_revised_6-16-22.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "winchester-osrp-draft": {
        "plan_name": "Open Space & Recreation Plan (Draft)",
        "municipality": "Winchester",
        "plan_type": "open_space_recreation",
        "year_adopted": None,
        "adoption_status": "draft",
        "pdf_filename": "Winchester+Open Space & Recreation Plan (DRAFT).pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "woburn-osrp-2023": {
        "plan_name": "Open Space and Recreation Plan Update",
        "municipality": "Woburn",
        "plan_type": "open_space_recreation",
        "year_adopted": 2023,
        "adoption_status": "adopted",
        "pdf_filename": "2023-12-27-Woburn-Open-Space-and-Recreation-Plan-Update.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    # ── Housing Production Plans ──────────────────────────────────────────
    "winchester-hpp-2024": {
        "plan_name": "Housing Production Plan 2024-2029",
        "municipality": "Winchester",
        "plan_type": "housing_production",
        "year_adopted": 2024,
        "adoption_status": "adopted",
        "pdf_filename": "Final Approved - Winchester HPP 2029 Updated - Main Report w Appendix 1.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "wakefield-hpp-2025": {
        "plan_name": "Housing Production Plan 2025",
        "municipality": "Wakefield",
        "plan_type": "housing_production",
        "year_adopted": 2025,
        "adoption_status": "adopted",
        "pdf_filename": "Wakefield 2025.09.30 HPP Final Plan.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
    "reading-hpp-2023": {
        "plan_name": "Housing Production Plan 2023",
        "municipality": "Reading",
        "plan_type": "housing_production",
        "year_adopted": 2023,
        "adoption_status": "adopted",
        "pdf_filename": "Reading Housing Production Plan 2023 03.21.2023.pdf",
        "pdf_url": None,
        "municipal_url": None,
        "consultant": None,
    },
}

# Topic taxonomy with keyword patterns
TOPIC_KEYWORDS = {
    "trails_and_greenways": ["trail", "greenway", "path", "bike path", "walking path", "hiking", "rail trail", "multi-use path", "bicycle", "pedestrian path"],
    "water_resources": ["water", "watershed", "aquifer", "groundwater", "drinking water", "water supply", "water quality", "stormwater", "river", "stream", "brook", "pond", "lake", "reservoir"],
    "wetlands": ["wetland", "marsh", "swamp", "bog", "vernal pool", "floodplain", "riparian"],
    "forests_and_wildlife": ["forest", "woodland", "wildlife", "habitat", "biodiversity", "species", "bird", "deer", "ecological", "ecosystem", "flora", "fauna"],
    "parks_and_playgrounds": ["park", "playground", "recreation area", "playing field", "picnic", "recreation facility", "community center", "recreation center", "tot lot"],
    "athletic_fields": ["athletic field", "baseball", "soccer", "football", "basketball", "tennis", "sports field", "ball field", "playing field"],
    "conservation_land": ["conservation", "conservation land", "conservation area", "protected land", "open space", "natural area", "preserve", "sanctuary"],
    "agricultural_land": ["agriculture", "farm", "farmland", "agricultural", "community garden", "urban farm", "crop"],
    "scenic_resources": ["scenic", "vista", "viewshed", "landscape", "scenic road", "historic landscape", "visual"],
    "historic_resources": ["historic", "historical", "heritage", "landmark", "archaeological", "national register", "historic district", "colonial"],
    "accessibility_and_ada": ["accessibility", "accessible", "ada", "americans with disabilities", "handicap", "wheelchair", "universal design", "barrier-free"],
    "environmental_justice": ["environmental justice", "ej", "equity", "equitable", "underserved", "disadvantaged", "minority", "low-income", "disproportionate"],
    "climate_resilience": ["climate", "climate change", "resilience", "adaptation", "mitigation", "greenhouse", "carbon", "sea level", "flooding", "heat island", "extreme weather"],
    "land_acquisition": ["acquisition", "acquire", "purchase", "land acquisition", "property acquisition", "conservation restriction", "easement"],
    "stewardship_and_maintenance": ["stewardship", "maintenance", "management", "invasive species", "restoration", "cleanup", "litter", "volunteer", "upkeep"],
    "funding_and_grants": ["funding", "grant", "cpa", "community preservation", "bond", "budget", "appropriation", "parc grant", "land and water conservation", "financial"],
    "partnerships": ["partnership", "collaboration", "coordinate", "cooperation", "interlocal", "regional", "agreement", "memorandum"],
    "community_engagement": ["community engagement", "public input", "survey", "public meeting", "outreach", "stakeholder", "participation", "forum", "workshop"],
    "regional_coordination": ["regional", "mapc", "regional coordination", "intermunicipal", "cross-border", "neighboring", "adjacent community"],
    "goals_and_objectives": ["goal", "objective", "action item", "recommendation", "strategy", "priority", "implementation"],
}

SECTION_TYPE_KEYWORDS = {
    "executive_summary": ["executive summary", "plan summary"],
    "introduction": ["introduction", "overview", "background", "purpose", "about this plan", "planning process"],
    "goals": ["goal", "objective", "vision", "action plan", "action item", "implementation", "recommendation", "seven year action plan", "five year action plan"],
    "inventory": ["inventory", "existing conditions", "resources", "facilities", "properties", "land use", "natural resources", "cultural resources"],
    "analysis": ["analysis", "assessment", "evaluation", "needs", "issues", "challenges", "opportunities", "environmental", "community needs", "community setting"],
    "recommendations": ["recommendation", "action", "strategy", "initiative", "proposed", "future", "priority"],
    "appendix": ["appendix", "appendices", "attachment", "supplement"],
}


# ── Utilities ──────────────────────────────────────────────────────────────

def find_pdf_dir():
    for d in PDF_DIR_OPTIONS:
        if d.exists() and any(d.glob("*.pdf")):
            return d
    print("ERROR: No PDF directory found.")
    sys.exit(1)


def find_pdf_path(filename):
    """Search all PDF directories for a specific filename."""
    for d in PDF_DIR_OPTIONS:
        if not d.exists():
            continue
        candidate = d / filename
        if candidate.exists():
            return candidate
    return None


def make_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]


def fuzzy_match(text, patterns, threshold=0.6):
    """Check if text fuzzy-matches any of the patterns."""
    text_lower = text.lower().strip()
    for pat in patterns:
        pat_lower = pat.lower()
        # Exact substring match
        if pat_lower in text_lower or text_lower in pat_lower:
            return True
        # Fuzzy ratio
        ratio = SequenceMatcher(None, text_lower, pat_lower).ratio()
        if ratio >= threshold:
            return True
    return False


def normalize_text(text):
    """Normalize unicode characters, fix ligatures and encoding artifacts."""
    if not text:
        return ""
    # Normalize unicode
    text = unicodedata.normalize("NFKD", text)
    # Fix common ligatures
    replacements = {
        "\ufb01": "fi", "\ufb02": "fl", "\ufb00": "ff",
        "\ufb03": "ffi", "\ufb04": "ffl",
        "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "--", "\u2026": "...",
        "\u00ae": "(R)", "\u00a9": "(C)", "\u2122": "(TM)",
        "\u00e9": "e", "\u00e8": "e", "\u00ea": "e",
        "\u00ee": "i", "\u00ef": "i",
        "\u00f4": "o", "\u00f6": "o",
        "\u00fc": "u", "\u00fb": "u",
        "\u00e7": "c", "\u00e0": "a", "\u00e2": "a",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Remove map glyph artifacts (GIS symbols)
    text = re.sub(r'[!]\s*\(', '', text)
    text = re.sub(r'[\u00ee\u00e9]{2,}', '', text)
    # Remove runs of special characters typical of map symbols
    text = re.sub(r'(?:[!()\u00ee\u00e9\u25cf\u25cb\u25a0\u25a1\u2605\u2606]{3,})', '', text)
    return text


def is_garbage_heading(text):
    """Check if a detected heading is actually garbage (table cell, number, etc.)."""
    text = text.strip()
    # Pure numbers, percentages, years by themselves
    if re.match(r'^[\d,.$%]+$', text):
        return True
    # Single year
    if re.match(r'^(19|20)\d{2}$', text):
        return True
    # Very short (1-2 chars)
    if len(text) <= 2:
        return True
    # TOC lines with dot leaders
    if re.search(r'\.{4,}', text):
        return True
    # Page number references at end
    if re.match(r'.+\.\s*\d{1,3}\s*$', text) and '...' in text:
        return True
    # Ends with comma or semicolon (mid-sentence fragment)
    if text.endswith(',') or text.endswith(';'):
        return True
    # Ends with period followed by nothing (could be sentence fragment)
    # but only if it also starts with lowercase
    if text[0].islower() and text.endswith('.'):
        return True
    # Starts with lowercase (mid-sentence)
    if text[0].islower():
        return True
    # Single word that's a common table header but not a section
    single_word_garbage = {
        'year', 'change', 'total', 'income', 'age', 'source', 'status',
        'type', 'acres', 'area', 'name', 'owner', 'size', 'use',
        'hockey', 'fall', 'spring', 'summer', 'winter', 'page',
        'dept', 'department', 'secretary', 'usda', 'date',
    }
    if text.lower() in single_word_garbage:
        return True
    # Contains vertical-text artifacts (single chars per "word")
    words = text.split()
    if len(words) > 3 and all(len(w) <= 2 for w in words):
        return True
    return False


# ── Template Loading ───────────────────────────────────────────────────────

def load_template(plan_type):
    """Load a plan type template from JSON config."""
    template_path = TEMPLATES_DIR / f"{plan_type}.json"
    if template_path.exists():
        with open(template_path) as f:
            return json.load(f)
    return None


def match_heading_to_template(heading_text, template):
    """Try to match a heading against template sections and subsections.
    Returns (section_id, section_type, template_section_label) or None."""
    if not template:
        return None

    heading_lower = heading_text.lower().strip()
    # Remove leading "section X" numbering for matching
    heading_clean = re.sub(r'^section\s+\d+\s*[-–:.]?\s*', '', heading_lower)
    heading_clean = re.sub(r'^\d+[\.\)]\s*', '', heading_clean)
    heading_clean = re.sub(r'^[a-z][\.\)]\s*', '', heading_clean)

    best_match = None
    best_score = 0.0

    for section in template.get("sections", []):
        # Check main section
        for pat in section.get("match_patterns", []):
            pat_lower = pat.lower()
            score = 0.0
            if pat_lower == heading_clean or pat_lower == heading_lower:
                score = 1.0
            elif pat_lower in heading_clean or heading_clean in pat_lower:
                score = 0.85
            else:
                score = SequenceMatcher(None, heading_clean, pat_lower).ratio()

            if score > best_score and score >= 0.55:
                best_score = score
                best_match = (section["id"], section.get("section_type", "other"), section["label"])

        # Check subsections
        for sub in section.get("subsections", []):
            for pat in sub.get("match_patterns", []):
                pat_lower = pat.lower()
                score = 0.0
                if pat_lower == heading_clean or pat_lower == heading_lower:
                    score = 1.0
                elif pat_lower in heading_clean or heading_clean in pat_lower:
                    score = 0.85
                else:
                    score = SequenceMatcher(None, heading_clean, pat_lower).ratio()

                if score > best_score and score >= 0.55:
                    best_score = score
                    best_match = (sub["id"], section.get("section_type", "other"), sub["label"])

    # Check appendix patterns
    for pat in template.get("appendix_patterns", []):
        if pat.lower() in heading_lower:
            if not best_match or best_score < 0.8:
                return ("appendix", "appendix", heading_text.strip())

    return best_match


# ── PDF Text Extraction ───────────────────────────────────────────────────

def extract_pages(pdf_path):
    """Extract per-page text with font metadata from PDF."""
    pages = []
    doc = fitz.open(str(pdf_path))

    for page_num in range(len(doc)):
        try:
            page = doc[page_num]
            blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
            page_data = {
                "page_number": page_num + 1,
                "text": "",
                "lines": [],  # structured line data with font info
            }

            for block in blocks:
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    line_text = ""
                    max_font_size = 0
                    is_bold = False
                    for span in line.get("spans", []):
                        text = span.get("text", "")
                        font_size = span.get("size", 12)
                        font_name = span.get("font", "")
                        bold = "bold" in font_name.lower() or "black" in font_name.lower()
                        line_text += text
                        max_font_size = max(max_font_size, font_size)
                        if bold:
                            is_bold = True

                    stripped = line_text.strip()
                    if stripped:
                        page_data["lines"].append({
                            "text": stripped,
                            "font_size": max_font_size,
                            "is_bold": is_bold,
                        })
                        page_data["text"] += line_text + "\n"

            pages.append(page_data)
        except Exception as e:
            print(f"    Warning: Error on page {page_num + 1}: {e}")
            pages.append({"page_number": page_num + 1, "text": "", "lines": []})

    doc.close()
    return pages


def get_table_regions(pdf_path):
    """Detect table bounding boxes on each page using PyMuPDF."""
    table_pages = {}  # page_num -> list of table bounding boxes
    try:
        doc = fitz.open(str(pdf_path))
        for page_num in range(len(doc)):
            page = doc[page_num]
            try:
                tabs = page.find_tables()
                if tabs.tables:
                    bboxes = []
                    for t in tabs.tables:
                        bboxes.append(t.bbox)  # (x0, y0, x1, y1)
                    table_pages[page_num + 1] = bboxes
            except Exception:
                pass
        doc.close()
    except Exception:
        pass
    return table_pages


def get_pdf_toc(pdf_path):
    """Extract the PDF's native table of contents."""
    try:
        doc = fitz.open(str(pdf_path))
        toc = doc.get_toc()
        doc.close()
        # Filter out document-assembly entries (embedded PDF names)
        filtered = []
        for level, title, page in toc:
            title_clean = title.strip()
            # Skip entries that look like filenames
            if title_clean.endswith('.pdf') or title_clean.endswith('.PDF'):
                continue
            # Skip entries with page <= 0
            if page <= 0:
                continue
            filtered.append({"level": level, "title": title_clean, "page": page})
        return filtered
    except Exception:
        return []


# ── Section Detection ──────────────────────────────────────────────────────

def detect_body_font_size(pages):
    """Find the most common (body) font size across all pages."""
    size_counts = {}
    for page in pages:
        for line in page.get("lines", []):
            size = round(line["font_size"], 1)
            text = line["text"].strip()
            if len(text) > 10:  # Only consider real text lines
                size_counts[size] = size_counts.get(size, 0) + len(text)
    if not size_counts:
        return 12.0
    return max(size_counts, key=size_counts.get)


def build_sections_from_toc(toc_entries, pages, template, total_pages):
    """Build sections using the PDF's native TOC entries."""
    if not toc_entries or len(toc_entries) < 3:
        return None  # Not enough TOC entries to be useful

    # Filter to reasonable section-level entries (levels 1-2)
    section_entries = [e for e in toc_entries if e["level"] <= 2]
    if len(section_entries) < 3:
        return None

    page_texts = {}
    for page in pages:
        page_texts[page["page_number"]] = page.get("text", "")

    sections = []
    for i, entry in enumerate(section_entries):
        start_page = entry["page"]
        end_page = section_entries[i + 1]["page"] if i + 1 < len(section_entries) else total_pages

        # Gather text
        section_text = ""
        for pg in range(start_page, end_page + 1):
            text = page_texts.get(pg, "")
            if pg == start_page:
                # Skip past the heading itself on the first page
                idx = text.find(entry["title"])
                if idx >= 0:
                    text = text[idx + len(entry["title"]):]
            if pg == end_page and i + 1 < len(section_entries):
                next_title = section_entries[i + 1]["title"]
                idx = text.find(next_title)
                if idx >= 0:
                    text = text[:idx]
            section_text += text + "\n"

        # Match to template
        template_match = match_heading_to_template(entry["title"], template)
        template_section = template_match[0] if template_match else None
        section_type = template_match[1] if template_match else "other"

        sections.append({
            "section_title": entry["title"].strip(),
            "section_number": None,
            "content": section_text.strip(),
            "page_start": start_page,
            "page_end": end_page,
            "sort_order": i,
            "template_section": template_section,
            "section_type": section_type,
            "toc_level": entry["level"],
        })

    return sections


def detect_headings_heuristic(pages, template, table_pages):
    """Detect section headings using tightened heuristics + template matching."""
    body_size = detect_body_font_size(pages)
    heading_threshold = body_size + 2.5  # Raised further to reduce false positives

    headings = []
    for page in pages:
        page_num = page["page_number"]
        page_table_bboxes = table_pages.get(page_num, [])

        for line in page.get("lines", []):
            text = line["text"].strip()
            font_size = line["font_size"]
            is_bold = line["is_bold"]

            if not text or len(text) <= 3 or len(text) > 200:
                continue

            # Skip if it's a garbage heading
            if is_garbage_heading(text):
                continue

            is_heading = False
            confidence = 0.0

            # Strategy 1: Template match (highest confidence)
            template_match = match_heading_to_template(text, template)
            if template_match:
                is_heading = True
                confidence = 0.9

            # Strategy 2: Large font size (clear heading)
            if not is_heading and font_size >= heading_threshold:
                # Require meaningful length (not single words or table cells)
                words = text.split()
                if len(words) >= 2 and len(text) > 8:
                    is_heading = True
                    confidence = 0.7

            # Strategy 3: Bold + larger than body + matches heading patterns
            if not is_heading and is_bold and font_size > body_size:
                if len(text.split()) <= 15 and not text.endswith('.'):
                    # Check for heading-like patterns
                    heading_pats = [
                        r"^(Section|Chapter|Part)\s+\d",
                        r"^\d+[\.\)]\s+[A-Z]",
                        r"^[IVXLCDM]+[\.\)]\s+",
                        r"^[A-Z][\.\)]\s+[A-Z]",  # "A. Statement of Purpose"
                    ]
                    for pat in heading_pats:
                        if re.match(pat, text):
                            is_heading = True
                            confidence = 0.75
                            break

                    # ALL-CAPS must be meaningfully above body size AND have 3+ words
                    if not is_heading and re.match(r"^[A-Z][A-Z\s&,]+$", text):
                        words = text.split()
                        if len(words) >= 3 and font_size >= body_size + 1.0:
                            is_heading = True
                            confidence = 0.5

            if is_heading:
                headings.append({
                    "text": text,
                    "page": page_num,
                    "font_size": font_size,
                    "is_bold": is_bold,
                    "confidence": confidence,
                    "template_match": template_match,
                })

    return headings


def build_sections_from_headings(headings, pages, total_pages):
    """Build sections from detected headings, handling overlap properly."""
    if not headings:
        full_text = "\n".join(p.get("text", "") for p in pages)
        return [{
            "section_title": "Full Document",
            "section_number": None,
            "content": full_text,
            "page_start": 1,
            "page_end": total_pages,
            "sort_order": 0,
            "template_section": None,
            "section_type": "other",
        }]

    page_texts = {}
    for page in pages:
        page_texts[page["page_number"]] = page.get("text", "")

    # Deduplicate headings (same text on same page)
    seen = set()
    unique_headings = []
    for h in headings:
        key = (h["text"], h["page"])
        if key not in seen:
            seen.add(key)
            unique_headings.append(h)
    headings = unique_headings

    # Sort by page, then by position in text
    headings.sort(key=lambda h: (h["page"], page_texts.get(h["page"], "").find(h["text"])))

    sections = []
    for i, heading in enumerate(headings):
        start_page = heading["page"]
        end_page = headings[i + 1]["page"] if i + 1 < len(headings) else total_pages

        section_text = ""
        for pg in range(start_page, end_page + 1):
            text = page_texts.get(pg, "")
            if pg == start_page:
                idx = text.find(heading["text"])
                if idx >= 0:
                    text = text[idx + len(heading["text"]):]
            if pg == end_page and i + 1 < len(headings):
                next_heading = headings[i + 1]["text"]
                idx = text.find(next_heading)
                if idx >= 0:
                    text = text[:idx]
            section_text += text + "\n"

        # Extract section number
        sec_num = None
        num_match = re.match(r"^(?:Section\s+)?(\d+[\.\d]*)", heading["text"])
        if num_match:
            sec_num = num_match.group(1)

        template_match = heading.get("template_match")
        sections.append({
            "section_title": heading["text"].strip(),
            "section_number": sec_num,
            "content": section_text.strip(),
            "page_start": start_page,
            "page_end": end_page,
            "sort_order": i,
            "template_section": template_match[0] if template_match else None,
            "section_type": template_match[1] if template_match else "other",
        })

    return sections


# ── Text Cleaning ──────────────────────────────────────────────────────────

def clean_text(text, municipality=""):
    """Clean extracted text: normalize encoding, remove artifacts."""
    if not text:
        return ""

    text = normalize_text(text)

    # Remove page numbers (standalone numbers on a line)
    text = re.sub(r"^\s*\d{1,3}\s*$", "", text, flags=re.MULTILINE)

    # Remove common headers/footers
    text = re.sub(r"(?i)(open space (and|&) recreation plan|osrp)\s*\n", "", text)
    text = re.sub(r"(?i)^(draft|final|revised)\s*$", "", text, flags=re.MULTILINE)

    # Remove municipality name + plan name repeated as header
    if municipality:
        text = re.sub(
            rf"(?i)^{re.escape(municipality)}\s+(open space|osrp).*$", "",
            text, flags=re.MULTILINE
        )

    # Remove TOC dot-leader lines
    text = re.sub(r"^.*?\.{5,}\s*\d+\s*$", "", text, flags=re.MULTILINE)

    # Remove vertical text artifacts (single chars separated by newlines)
    text = re.sub(r"(?:\b\w\n){4,}", "", text)

    # Fix hyphenation at line breaks
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove leading/trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()


def clean_and_merge_sections(sections, municipality=""):
    """Clean sections, remove empties, merge tiny ones, deduplicate."""
    # Clean each section's content
    for section in sections:
        section["content"] = clean_text(section["content"], municipality)

    # Remove empty sections
    sections = [s for s in sections if s["content"] and len(s["content"].strip()) > 0]

    # Merge tiny sections (< 500 chars) into previous section
    MIN_SECTION_LENGTH = 500
    merged = []
    for section in sections:
        if merged and len(section["content"]) < MIN_SECTION_LENGTH:
            # Merge into previous
            merged[-1]["content"] += "\n\n" + section["section_title"] + "\n" + section["content"]
            merged[-1]["page_end"] = max(merged[-1]["page_end"], section["page_end"])
        else:
            merged.append(section)
    sections = merged

    # Deduplicate overlapping sections (>80% content overlap)
    deduped = []
    for section in sections:
        is_dup = False
        for existing in deduped:
            if existing["page_start"] == section["page_start"]:
                # Same start page - check overlap
                overlap = SequenceMatcher(
                    None,
                    existing["content"][:500],
                    section["content"][:500]
                ).ratio()
                if overlap > 0.8:
                    # Keep the one with longer content
                    if len(section["content"]) > len(existing["content"]):
                        deduped.remove(existing)
                        deduped.append(section)
                    is_dup = True
                    break
        if not is_dup:
            deduped.append(section)

    # Re-number sort_order
    for i, s in enumerate(deduped):
        s["sort_order"] = i

    return deduped


# ── Topic Tagging ──────────────────────────────────────────────────────────

def tag_section_topics(section):
    """Tag a section with topics based on keyword matching."""
    content_lower = (section["content"] + " " + section.get("section_title", "")).lower()
    topics = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(content_lower.count(kw.lower()) for kw in keywords)
        if score >= 2:
            topics.append(topic)
    return topics


def classify_section_type(section):
    """Classify section type. Prefer template match, fall back to keywords."""
    # If already classified by template
    if section.get("section_type") and section["section_type"] != "other":
        return section["section_type"]

    title_lower = section.get("section_title", "").lower()
    content_lower = section.get("content", "")[:500].lower()

    scores = {}
    for sec_type, keywords in SECTION_TYPE_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in title_lower:
                score += 10
            if kw in content_lower:
                score += 1
        scores[sec_type] = score

    best_type = max(scores, key=scores.get)
    return best_type if scores[best_type] > 0 else "other"


# ── Recommendation Extraction ──────────────────────────────────────────────

def extract_recommendations(sections, plan_id):
    """Extract recommendations from goal/action sections.

    For TOC-based plans with few large sections, also scan sections
    whose content contains dense action items even if the title doesn't match.
    """
    recommendations = []

    # Determine if this is a TOC-based plan with few large sections
    is_sparse_plan = len(sections) <= 30

    for section in sections:
        sec_type = section.get("section_type", "other")
        title_lower = section.get("section_title", "").lower()
        template_sec = section.get("template_section", "")

        is_rec_section = sec_type in ("goals", "recommendations")
        has_rec_title = any(kw in title_lower for kw in [
            "goal", "objective", "action", "recommendation", "strategy",
            "implementation", "priority", "seven year", "five year"
        ])
        is_action_plan = template_sec == "action_plan"

        # For sparse/TOC-based plans: also scan sections with dense action content
        has_action_content = False
        page_span = section.get("page_end", 0) - section.get("page_start", 0)
        if is_sparse_plan and not (is_rec_section or has_rec_title or is_action_plan):
            content = section.get("content", "")

            if page_span >= 30:
                # Mega-section (entire plan body): extract only the goals/action subsection
                # Find internal headings that signal goal/action content
                goal_pattern = (
                    r'(?:^|\n)\s*(?:(?:SECTION|Chapter)\s+[\dIVXLCDM]+[:\s]+)?'
                    r'(Goals?\s+(?:and|&)\s+Objectives?|Action\s+Plan|Seven[- ]Year\s+Action|'
                    r'Five[- ]Year\s+Action|Goals?,?\s+Objectives?,?\s+(?:and|&)\s+Actions?|'
                    r'Recommendations?\s+(?:and|&)\s+(?:Implementation|Actions?))'
                )
                matches = list(re.finditer(goal_pattern, content, re.IGNORECASE | re.MULTILINE))
                if matches:
                    # Skip TOC-area matches (first 5% of content). Use last match in body
                    # since TOC references appear early.
                    toc_cutoff = len(content) // 20  # 5%
                    body_matches = [m for m in matches if m.start() > toc_cutoff]
                    if body_matches:
                        start_pos = body_matches[0].start()
                    else:
                        start_pos = matches[-1].start()
                    # Try to find the next major section heading to limit scope
                    next_heading = re.search(
                        r'\n\s*(?:(?:SECTION|Chapter)\s+[\dIVXLCDM]+[:\s]+)?\s*(?:Appendix|References|Public\s+Comments|Letters?\s+of\s+Support|Bibliography)\b',
                        content[start_pos + 100:], re.IGNORECASE
                    )
                    if next_heading:
                        end_pos = start_pos + 100 + next_heading.start()
                    else:
                        end_pos = len(content)
                    # Replace section content with just the goal/action portion
                    section = dict(section)  # Don't mutate original
                    section["content"] = content[start_pos:end_pos]
                    has_action_content = True
            else:
                content_lower = content.lower()
                content_len = len(content)
                action_verbs = ["develop", "create", "establish", "improve", "expand", "maintain",
                              "protect", "preserve", "acquire", "support", "coordinate",
                              "enhance", "implement", "pursue", "seek", "explore",
                              "continue", "update", "evaluate", "conduct", "increase", "promote"]
                verb_count = sum(content_lower.count(v) for v in action_verbs)
                numbered_items = len(re.findall(r'^\s*\d+[\.\)]\s+[A-Z]', content, re.MULTILINE))
                bulleted_items = len(re.findall(r'^\s*[*\u2022\u25cf\u2013-]\s+[A-Z]', content, re.MULTILINE))
                verb_density = verb_count / max(content_len / 1000, 1)
                if (verb_density >= 3 and verb_count >= 10 and (numbered_items >= 5 or bulleted_items >= 5)):
                    has_action_content = True

        if not (is_rec_section or has_rec_title or is_action_plan or has_action_content):
            continue

        content = section.get("content", "")
        if not content:
            continue

        # For sections matched only by content-density scanning (not by title/type),
        # use strict extraction: only structured items (numbered, bulleted, labeled).
        # This prevents narrative paragraphs from being extracted as recommendations.
        strict_mode = has_action_content and not (is_rec_section or has_rec_title or is_action_plan)

        lines = content.split("\n")
        current_rec = ""

        for line in lines:
            line = line.strip()
            if not line:
                if current_rec:
                    rec = _parse_recommendation(current_rec, section, plan_id)
                    if rec:
                        recommendations.append(rec)
                    current_rec = ""
                continue

            is_numbered = bool(re.match(r"^[\d]+[\.\)]\s+", line))
            is_lettered = bool(re.match(r"^[a-zA-Z][\.\)]\s+", line))
            is_bulleted = bool(re.match(r"^[*\u2022\u25cf\u25cb\u25a0\u25a1\u2013\u2014-]\s+", line))
            is_labeled = bool(re.match(
                r"^(Action|Goal|Objective|Recommendation|Strategy)\s*[\d#:.]",
                line, re.IGNORECASE
            ))
            is_new_item = is_numbered or is_lettered or is_bulleted or is_labeled

            action_verbs = [
                "develop", "create", "establish", "improve", "expand", "maintain",
                "protect", "preserve", "acquire", "support", "coordinate", "partner",
                "enhance", "implement", "pursue", "seek", "explore", "investigate",
                "continue", "update", "evaluate", "conduct", "increase", "promote",
                "encourage", "facilitate", "identify", "assess", "ensure"
            ]
            starts_with_action = any(line.lower().startswith(v) for v in action_verbs)

            if strict_mode:
                # In strict mode, only start new recs from structured items
                if is_new_item:
                    if current_rec:
                        rec = _parse_recommendation(current_rec, section, plan_id)
                        if rec:
                            recommendations.append(rec)
                    current_rec = line
                elif current_rec and not re.match(r'^[A-Z][a-z]+ [A-Z]', line):
                    # Continue only if it doesn't look like a new paragraph heading
                    current_rec += " " + line
            else:
                if is_new_item or (starts_with_action and not current_rec):
                    if current_rec:
                        rec = _parse_recommendation(current_rec, section, plan_id)
                        if rec:
                            recommendations.append(rec)
                    current_rec = line
                elif current_rec:
                    current_rec += " " + line

        if current_rec:
            rec = _parse_recommendation(current_rec, section, plan_id)
            if rec:
                recommendations.append(rec)

    return recommendations


def _parse_recommendation(text, section, plan_id):
    text = text.strip()
    text = re.sub(r"^[\d]+[\.\)]\s*", "", text)
    text = re.sub(r"^[a-zA-Z][\.\)]\s*", "", text)
    text = re.sub(r"^[*\u2022\u25cf\u25cb\u25a0\u25a1\u2013\u2014-]\s*", "", text)
    text = text.strip()

    if len(text) < 15 or len(text) > 1000:
        return None

    category = _categorize_recommendation(text)

    priority = None
    if re.search(r"\b(high\s+priority|critical|urgent|immediate)\b", text, re.IGNORECASE):
        priority = "high"
    elif re.search(r"\b(medium\s+priority|moderate)\b", text, re.IGNORECASE):
        priority = "medium"
    elif re.search(r"\b(low\s+priority|long.?term|when feasible)\b", text, re.IGNORECASE):
        priority = "low"

    timeframe = None
    tf_match = re.search(
        r"(\d+[-\u2013]\d+\s+years?|\d+\s+years?|short.?term|medium.?term|long.?term|ongoing|annually)",
        text, re.IGNORECASE
    )
    if tf_match:
        timeframe = tf_match.group(1)

    responsible = None
    rp_patterns = [
        r"(?:responsible|lead|by)\s*[:;]\s*([^\.]+)",
        r"\(([A-Z][a-zA-Z\s,/&]+(?:Department|Commission|Board|Committee|Council|Division))\)",
    ]
    for pat in rp_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            responsible = m.group(1).strip()
            break

    topics = []
    text_lower = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                if topic not in topics:
                    topics.append(topic)
                break

    return {
        "id": make_id(plan_id + text[:50]),
        "plan_id": plan_id,
        "text": text,
        "category": category,
        "priority": priority,
        "timeframe": timeframe,
        "responsible_party": responsible,
        "source_section_id": section.get("id"),
        "topics": topics,
    }


def _categorize_recommendation(text):
    text_lower = text.lower()
    categories = {
        "trails": ["trail", "greenway", "path", "bike", "walking", "pedestrian"],
        "water_resources": ["water", "watershed", "stormwater", "drainage", "pond", "river", "stream"],
        "conservation": ["conservation", "protect", "preserve", "habitat", "wildlife", "natural"],
        "parks": ["park", "playground", "recreation area", "playing field", "facility"],
        "accessibility": ["access", "ada", "accessible", "disability", "universal design"],
        "acquisition": ["acquire", "acquisition", "purchase", "land purchase", "easement"],
        "stewardship": ["maintenance", "stewardship", "manage", "invasive", "restore", "cleanup"],
        "funding": ["fund", "grant", "cpa", "budget", "financial", "revenue"],
        "partnerships": ["partner", "collaborat", "coordinat", "agreement", "volunteer"],
        "climate": ["climate", "resilience", "flood", "heat", "carbon", "green infrastructure"],
        "engagement": ["community", "engagement", "outreach", "public", "education", "awareness"],
    }
    best_cat = "general"
    best_score = 0
    for cat, keywords in categories.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_cat = cat
    return best_cat


# ── Data Source Extraction ─────────────────────────────────────────────────

def extract_data_sources(sections, plan_id, template):
    """Extract references to data sources from section content."""
    sources = []
    known_sources = template.get("known_data_sources", []) if template else []

    seen = set()
    for section in sections:
        content = section.get("content", "")
        if not content:
            continue
        content_lower = content.lower()

        for ds in known_sources:
            for pat in ds.get("patterns", []):
                if pat.lower() in content_lower:
                    key = (ds["name"], section.get("id", ""))
                    if key not in seen:
                        seen.add(key)
                        # Try to find year
                        year = None
                        year_match = re.search(
                            rf'{re.escape(pat)}[^.]*?(\d{{4}})',
                            content, re.IGNORECASE
                        )
                        if year_match:
                            year = year_match.group(1)

                        sources.append({
                            "id": make_id(plan_id + ds["name"] + section.get("id", "")),
                            "plan_id": plan_id,
                            "section_id": section.get("id"),
                            "source_name": ds["name"],
                            "source_type": "reference",
                            "year": year,
                            "page_number": section.get("page_start"),
                            "url": None,
                        })
                    break  # Only match first pattern per source per section

    return sources


# ── Consultant Extraction ──────────────────────────────────────────────────

def extract_consultant(pages, template):
    """Try to extract the consulting firm from the first few pages."""
    known_consultants = template.get("known_consultants", []) if template else []

    # Scan first 5 pages for consultant references
    search_text = ""
    for page in pages[:5]:
        search_text += page.get("text", "") + "\n"

    search_text_lower = search_text.lower()

    # Look for explicit patterns
    consultant_patterns = [
        r"(?:prepared|produced|written|authored|drafted)\s+(?:for.*?)?by[:\s]+([^\n]+)",
        r"(?:planning\s+)?consultant[s]?[:\s]+([^\n]+)",
        r"(?:prepared|produced)\s+(?:in\s+(?:partnership|collaboration)\s+with)[:\s]+([^\n]+)",
    ]

    for pat in consultant_patterns:
        m = re.search(pat, search_text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # Skip if it's clearly not a consultant
            skip_words = [
                "acknowledgement", "committee", "commission", "board",
                "town of", "city of", "residents", "volunteers",
                "commonwealth", "secretary", "governor",
            ]
            if any(sw in candidate.lower() for sw in skip_words):
                continue
            # Check against known consultants
            for known in known_consultants:
                if known.lower() in candidate.lower():
                    return known
            # Return the raw match if it looks like a firm name
            if len(candidate) > 3 and len(candidate) < 100:
                return candidate

    # Fallback: scan for known consultant names in first 10 pages
    extended_text = ""
    for page in pages[:10]:
        extended_text += page.get("text", "") + "\n"
    extended_lower = extended_text.lower()

    for known in known_consultants:
        if known.lower() in extended_lower:
            return known

    return None


# ── Summary Generation ─────────────────────────────────────────────────────

def generate_summary(sections):
    """Generate a plan summary from the executive summary or introduction."""
    # Priority order for finding summary content
    preferred_types = ["executive_summary", "introduction"]
    preferred_templates = ["executive_summary", "introduction", "statement_of_purpose"]

    # First try: template-matched sections
    for template_id in preferred_templates:
        for section in sections:
            if section.get("template_section") == template_id:
                content = section.get("content", "").strip()
                if len(content) > 100:
                    return _truncate_summary(content)

    # Second try: section type match
    for sec_type in preferred_types:
        for section in sections:
            if section.get("section_type") == sec_type:
                content = section.get("content", "").strip()
                if len(content) > 100:
                    # Skip if it looks like acknowledgements or addresses
                    first_100 = content[:100].lower()
                    if any(skip in first_100 for skip in [
                        "acknowledgement", "committee member", "prepared by",
                        "street", "suite", "ma 0", "subcommittee"
                    ]):
                        continue
                    return _truncate_summary(content)

    # Last resort: first substantial section that's not garbage
    for section in sections:
        content = section.get("content", "").strip()
        if len(content) > 200:
            first_100 = content[:100].lower()
            if any(skip in first_100 for skip in [
                "acknowledgement", "committee", "prepared by", "table of contents",
                "street", "suite", "ma 0", "appendix", "rev:", "revised"
            ]):
                continue
            return _truncate_summary(content)

    return None


def _truncate_summary(content):
    """Extract first 2-3 sentences, max 500 chars."""
    sentences = re.split(r'(?<=[.!?])\s+', content)
    summary = " ".join(sentences[:3])
    if len(summary) > 500:
        summary = summary[:497] + "..."
    return summary


# ── MMA Data Import ────────────────────────────────────────────────────────

def load_mma_data():
    """Load Massachusetts Municipal Association data from CSV."""
    if not MMA_CSV_PATH.exists():
        print("  Warning: MMA CSV not found, skipping municipal data import")
        return {}

    mma_data = {}
    with open(MMA_CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        # Skip the source/notes row (row 2 in the CSV)
        rows = list(reader)
        for row in rows:
            name = row.get('Title', '').strip()
            if not name or name.startswith(',') or name.startswith('Source'):
                continue

            # Parse numeric fields safely
            def parse_int(val):
                if not val:
                    return None
                val = val.strip().replace(',', '').replace('"', '')
                try:
                    return int(float(val))
                except (ValueError, TypeError):
                    return None

            def parse_float(val):
                if not val:
                    return None
                val = val.strip().replace(',', '').replace('"', '').replace('$', '').replace('%', '')
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None

            mma_data[name] = {
                "city_or_town": row.get('city_of_town_of', '').strip() or None,
                "population": parse_int(row.get('population')),
                "population_density": parse_float(row.get('population_density')),
                "county": row.get('county', '').strip() or None,
                "area_sq_miles": parse_float(row.get('area')),
                "form_of_government": row.get('form_of_government', '').strip() or None,
                "income_per_capita": parse_int(row.get('income_per_capita')),
                "median_home_value": parse_int(row.get('median_value_of_owner_occupied_housing_units')),
                "median_gross_rent": parse_int(row.get('median_gross_rent')),
                "total_households": parse_int(row.get('total_households')),
                "average_household_size": parse_float(row.get('average_household_size')),
                "registered_voters": parse_int(row.get('registered_voters')),
                "owner_occupied_rate": parse_float(row.get('owner_occupied_housing_unit_rate')),
                "residential_tax_rate": parse_float(row.get('residential_tax_rate')),
                "commercial_tax_rate": parse_float(row.get('commercial_tax_rate')),
                "average_tax_bill": parse_int(row.get('average_tax_bill')),
                "total_expenditures": parse_int(row.get('total_expenditures')),
                "tax_levy": parse_int(row.get('tax_levy')),
                "state_aid": parse_int(row.get('state_aid')),
                "local_receipts": parse_int(row.get('local_receipts')),
                "public_roads_miles": parse_float(row.get('public_roads')),
                "regional_planning_agency": row.get('regional_planning_agency', '').strip() or None,
                "incorporation_date": row.get('incorporation_date', '').strip() or None,
                "cpa_year_enacted": parse_int(row.get('year_enacted')),
                "eqv_per_capita": parse_int(row.get('eqv_per_capita')),
            }

    return mma_data


# ── Database ───────────────────────────────────────────────────────────────

def create_database():
    """Create the SQLite database with enhanced schema."""
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE municipalities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mapc_subregion TEXT,
            population INTEGER,
            area_sq_miles REAL,
            latitude REAL,
            longitude REAL,
            city_or_town TEXT,
            population_density REAL,
            county TEXT,
            form_of_government TEXT,
            income_per_capita INTEGER,
            median_home_value INTEGER,
            median_gross_rent INTEGER,
            total_households INTEGER,
            average_household_size REAL,
            registered_voters INTEGER,
            owner_occupied_rate REAL,
            residential_tax_rate REAL,
            commercial_tax_rate REAL,
            average_tax_bill INTEGER,
            total_expenditures INTEGER,
            tax_levy INTEGER,
            state_aid INTEGER,
            local_receipts INTEGER,
            public_roads_miles REAL,
            regional_planning_agency TEXT,
            incorporation_date TEXT,
            cpa_year_enacted INTEGER,
            eqv_per_capita INTEGER
        );

        CREATE TABLE plans (
            id TEXT PRIMARY KEY,
            plan_name TEXT NOT NULL,
            municipality TEXT NOT NULL,
            plan_type TEXT NOT NULL DEFAULT 'open_space_recreation',
            year_adopted INTEGER,
            adoption_status TEXT DEFAULT 'unknown',
            pdf_filename TEXT,
            pdf_url TEXT,
            municipal_url TEXT,
            consultant TEXT,
            mapc_involvement INTEGER DEFAULT 0,
            topics TEXT,
            summary TEXT
        );

        CREATE TABLE sections (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL,
            section_title TEXT,
            section_number TEXT,
            content TEXT,
            page_start INTEGER,
            page_end INTEGER,
            topics TEXT,
            section_type TEXT DEFAULT 'other',
            template_section TEXT,
            sort_order INTEGER,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
        );

        CREATE TABLE recommendations (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL,
            text TEXT NOT NULL,
            category TEXT,
            priority TEXT,
            timeframe TEXT,
            responsible_party TEXT,
            source_section_id TEXT,
            topics TEXT,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
        );

        CREATE TABLE data_sources (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL,
            section_id TEXT,
            source_name TEXT NOT NULL,
            source_type TEXT,
            year TEXT,
            page_number INTEGER,
            url TEXT,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
        );

        CREATE VIRTUAL TABLE sections_fts USING fts5(
            plan_id,
            section_title,
            content,
            content='sections',
            content_rowid='rowid'
        );

        CREATE TRIGGER sections_ai AFTER INSERT ON sections BEGIN
            INSERT INTO sections_fts(rowid, plan_id, section_title, content)
            VALUES (new.rowid, new.plan_id, new.section_title, new.content);
        END;
    """)

    conn.commit()
    return conn


def insert_municipality(conn, muni_id, name, data):
    cols = [
        "id", "name", "mapc_subregion", "population", "area_sq_miles",
        "latitude", "longitude", "city_or_town", "population_density",
        "county", "form_of_government", "income_per_capita",
        "median_home_value", "median_gross_rent", "total_households",
        "average_household_size", "registered_voters", "owner_occupied_rate",
        "residential_tax_rate", "commercial_tax_rate", "average_tax_bill",
        "total_expenditures", "tax_levy", "state_aid", "local_receipts",
        "public_roads_miles", "regional_planning_agency", "incorporation_date",
        "cpa_year_enacted", "eqv_per_capita",
    ]
    vals = [
        muni_id, name,
        data.get("mapc_subregion"), data.get("population"), data.get("area_sq_miles"),
        data.get("latitude"), data.get("longitude"), data.get("city_or_town"),
        data.get("population_density"), data.get("county"),
        data.get("form_of_government"), data.get("income_per_capita"),
        data.get("median_home_value"), data.get("median_gross_rent"),
        data.get("total_households"), data.get("average_household_size"),
        data.get("registered_voters"), data.get("owner_occupied_rate"),
        data.get("residential_tax_rate"), data.get("commercial_tax_rate"),
        data.get("average_tax_bill"), data.get("total_expenditures"),
        data.get("tax_levy"), data.get("state_aid"), data.get("local_receipts"),
        data.get("public_roads_miles"), data.get("regional_planning_agency"),
        data.get("incorporation_date"), data.get("cpa_year_enacted"),
        data.get("eqv_per_capita"),
    ]
    placeholders = ", ".join(["?"] * len(cols))
    col_names = ", ".join(cols)
    conn.execute(f"INSERT OR REPLACE INTO municipalities ({col_names}) VALUES ({placeholders})", vals)


def insert_plan(conn, plan_id, meta):
    conn.execute(
        """INSERT OR REPLACE INTO plans
           (id, plan_name, municipality, plan_type, year_adopted, adoption_status,
            pdf_filename, pdf_url, municipal_url, consultant, topics, summary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (plan_id, meta["plan_name"], meta["municipality"], meta["plan_type"],
         meta["year_adopted"], meta["adoption_status"], meta["pdf_filename"],
         meta.get("pdf_url"), meta.get("municipal_url"),
         meta.get("consultant"), json.dumps(meta.get("topics", [])), meta.get("summary"))
    )


def insert_section(conn, section):
    conn.execute(
        """INSERT OR REPLACE INTO sections
           (id, plan_id, section_title, section_number, content, page_start, page_end,
            topics, section_type, template_section, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (section["id"], section["plan_id"], section["section_title"],
         section.get("section_number"), section["content"],
         section["page_start"], section["page_end"],
         json.dumps(section.get("topics", [])), section.get("section_type", "other"),
         section.get("template_section"), section.get("sort_order", 0))
    )


def insert_recommendation(conn, rec):
    conn.execute(
        """INSERT OR REPLACE INTO recommendations
           (id, plan_id, text, category, priority, timeframe, responsible_party,
            source_section_id, topics)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (rec["id"], rec["plan_id"], rec["text"], rec["category"],
         rec["priority"], rec["timeframe"], rec["responsible_party"],
         rec["source_section_id"], json.dumps(rec.get("topics", [])))
    )


def insert_data_source(conn, ds):
    conn.execute(
        """INSERT OR REPLACE INTO data_sources
           (id, plan_id, section_id, source_name, source_type, year, page_number, url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (ds["id"], ds["plan_id"], ds.get("section_id"), ds["source_name"],
         ds.get("source_type"), ds.get("year"), ds.get("page_number"), ds.get("url"))
    )


# ── JSON Output ────────────────────────────────────────────────────────────

def generate_json_output(all_plans_data, all_recommendations, mma_data):
    PLANS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # plans.json
    plans_list = []
    for plan_id, data in all_plans_data.items():
        meta = data["metadata"]
        plans_list.append({
            "id": plan_id,
            "plan_name": meta["plan_name"],
            "municipality": meta["municipality"],
            "plan_type": meta["plan_type"],
            "year_adopted": meta["year_adopted"],
            "adoption_status": meta["adoption_status"],
            "pdf_filename": meta["pdf_filename"],
            "pdf_url": meta.get("pdf_url"),
            "municipal_url": meta.get("municipal_url"),
            "consultant": meta.get("consultant"),
            "topics": meta.get("topics", []),
            "summary": data.get("summary"),
            "section_count": len(data["sections"]),
            "recommendation_count": len(data["recommendations"]),
        })

    with open(OUTPUT_DIR / "plans.json", "w") as f:
        json.dump(plans_list, f, indent=2)

    # Per-plan JSON
    for plan_id, data in all_plans_data.items():
        plan_data = {
            "id": plan_id,
            "metadata": data["metadata"],
            "summary": data.get("summary"),
            "sections": data["sections"],
            "recommendations": data["recommendations"],
            "data_sources": data.get("data_sources", []),
        }
        with open(PLANS_OUTPUT_DIR / f"{plan_id}.json", "w") as f:
            json.dump(plan_data, f, indent=2)

    # recommendations.json
    with open(OUTPUT_DIR / "recommendations.json", "w") as f:
        json.dump(all_recommendations, f, indent=2)

    # municipalities.json
    plan_counts = {}
    for plan_id, data in all_plans_data.items():
        muni = data["metadata"]["municipality"]
        plan_counts[muni] = plan_counts.get(muni, 0) + 1

    munis = []
    for name, data in mma_data.items():
        munis.append({
            "id": name.lower().replace(" ", "-"),
            "name": name,
            "population": data.get("population"),
            "area_sq_miles": data.get("area_sq_miles"),
            "county": data.get("county"),
            "city_or_town": data.get("city_or_town"),
            "regional_planning_agency": data.get("regional_planning_agency"),
            "plan_count": plan_counts.get(name, 0),
            "has_plan": name in plan_counts,
        })

    with open(OUTPUT_DIR / "municipalities.json", "w") as f:
        json.dump(munis, f, indent=2)


# ── Main Pipeline ──────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("EveryPlan Data Pipeline v2.0")
    print("Template-guided parsing with table detection")
    print("=" * 60)

    pdf_dir = find_pdf_dir()
    print(f"\nPDF source: {pdf_dir}")
    print(f"Output: {OUTPUT_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PLANS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load MMA municipal data
    print("\nLoading MMA municipal data...")
    mma_data = load_mma_data()
    print(f"  Loaded {len(mma_data)} municipalities from MMA Data Hub")

    # Create database
    print("Creating SQLite database...")
    conn = create_database()

    # Insert all MMA municipalities
    print("Inserting municipality data...")
    nspc_towns = {m["municipality"] for m in PLAN_METADATA.values()}

    # Define MAPC subregion for our known towns
    subregion_map = {
        "Reading": "NSPC", "Burlington": "NSPC", "Lynnfield": "NSPC",
        "North Reading": "NSPC", "Stoneham": "NSPC", "Wakefield": "NSPC",
        "Wilmington": "NSPC", "Winchester": "NSPC", "Woburn": "NSPC",
    }

    # Known NSPC municipality lat/lng (for those in our plans)
    known_coords = {
        "Reading": (42.5265, -71.0953), "Burlington": (42.5048, -71.1956),
        "Lynnfield": (42.5320, -71.0450), "North Reading": (42.5751, -71.0787),
        "Stoneham": (42.4804, -71.0976), "Wakefield": (42.5065, -71.0731),
        "Wilmington": (42.5576, -71.1737), "Winchester": (42.4521, -71.1370),
        "Woburn": (42.4793, -71.1523),
    }

    muni_count = 0
    for name, data in mma_data.items():
        muni_id = name.lower().replace(" ", "-")
        merged = dict(data)
        merged["mapc_subregion"] = subregion_map.get(name)
        coords = known_coords.get(name, (None, None))
        merged["latitude"] = coords[0]
        merged["longitude"] = coords[1]
        insert_municipality(conn, muni_id, name, merged)
        muni_count += 1

    # Also insert any NSPC towns that might not be in MMA data
    for name in subregion_map:
        muni_id = name.lower().replace(" ", "-")
        if name not in mma_data:
            coords = known_coords.get(name, (None, None))
            insert_municipality(conn, muni_id, name, {
                "mapc_subregion": "NSPC",
                "latitude": coords[0], "longitude": coords[1],
            })
            muni_count += 1
    conn.commit()
    print(f"  Inserted {muni_count} municipalities")

    # Process each plan
    all_plans_data = {}
    all_recommendations = []
    all_data_sources = []

    for plan_id, meta in PLAN_METADATA.items():
        pdf_path = find_pdf_path(meta["pdf_filename"])
        if not pdf_path:
            # Try alternate filenames across all directories
            for d in PDF_DIR_OPTIONS:
                if not d.exists():
                    continue
                alt_names = [f for f in os.listdir(d) if f.endswith('.pdf')
                            and meta['municipality'].lower() in f.lower()]
                if alt_names:
                    pdf_path = d / alt_names[0]
                    print(f"\n  Using alternate: {alt_names[0]}")
                    break
            if not pdf_path:
                print(f"\n  SKIP {plan_id}: PDF not found")
                continue

        print(f"\n{'=' * 50}")
        print(f"  {meta['municipality']} - {meta['plan_name']}")
        print(f"  PDF: {meta['pdf_filename']}")

        # Load template
        template = load_template(meta["plan_type"])
        template_name = template["plan_type_label"] if template else "No template"
        print(f"  Template: {template_name}")

        # Step 1: Extract text
        print("  [1/7] Extracting text...")
        pages = extract_pages(pdf_path)
        total_pages = len(pages)
        print(f"    {total_pages} pages")

        if not pages:
            print("    ERROR: No pages extracted")
            continue

        # Step 2: Detect tables
        print("  [2/7] Detecting tables...")
        table_pages = get_table_regions(pdf_path)
        table_count = sum(len(v) for v in table_pages.values())
        print(f"    {table_count} tables on {len(table_pages)} pages")

        # Step 3: Parse sections (TOC-first, then heuristic)
        print("  [3/7] Parsing sections...")

        # Try native PDF TOC first
        toc = get_pdf_toc(pdf_path)
        sections = None
        parse_method = "none"

        if toc and len(toc) >= 5:
            print(f"    Trying PDF TOC ({len(toc)} entries)...")
            sections = build_sections_from_toc(toc, pages, template, total_pages)
            if sections:
                parse_method = "toc"
                print(f"    TOC-based: {len(sections)} sections")

        if not sections:
            # Fall back to heuristic with template guidance
            print("    Using heuristic heading detection + template matching...")
            headings = detect_headings_heuristic(pages, template, table_pages)
            print(f"    {len(headings)} headings detected")
            sections = build_sections_from_headings(headings, pages, total_pages)
            parse_method = "heuristic"
            print(f"    Heuristic: {len(sections)} sections")

        # Step 4: Clean and merge
        print("  [4/7] Cleaning and merging...")
        sections = clean_and_merge_sections(sections, meta["municipality"])
        print(f"    {len(sections)} sections after cleaning")

        # Step 5: Tag and classify
        print("  [5/7] Tagging topics and classifying...")
        for section in sections:
            section["id"] = make_id(plan_id + section["section_title"] + str(section["sort_order"]))
            section["plan_id"] = plan_id
            section["topics"] = tag_section_topics(section)
            section["section_type"] = classify_section_type(section)

        # Count template matches
        template_matches = sum(1 for s in sections if s.get("template_section"))
        print(f"    Template matches: {template_matches}/{len(sections)}")

        topic_counts = {}
        for s in sections:
            for t in s["topics"]:
                topic_counts[t] = topic_counts.get(t, 0) + 1
        top_topics = dict(sorted(topic_counts.items(), key=lambda x: -x[1])[:5])
        print(f"    Top topics: {top_topics}")

        # Step 6: Extract recommendations
        print("  [6/7] Extracting recommendations...")
        recs = extract_recommendations(sections, plan_id)
        print(f"    {len(recs)} recommendations")

        # Extract consultant
        consultant = extract_consultant(pages, template)
        if consultant:
            meta["consultant"] = consultant
            print(f"    Consultant: {consultant}")

        # Extract data sources
        data_sources = extract_data_sources(sections, plan_id, template)
        print(f"    {len(data_sources)} data source references")

        # Generate summary
        summary = generate_summary(sections)

        # Derive plan-level topics from sections
        plan_topics = list(set(t for s in sections for t in s.get("topics", [])))
        meta["topics"] = plan_topics[:10]  # Top 10

        # Step 7: Insert into database
        print("  [7/7] Inserting into database...")
        meta_copy = dict(meta)
        meta_copy["summary"] = summary
        insert_plan(conn, plan_id, meta_copy)

        for section in sections:
            insert_section(conn, section)
        for rec in recs:
            insert_recommendation(conn, rec)
        for ds in data_sources:
            insert_data_source(conn, ds)

        conn.commit()

        all_plans_data[plan_id] = {
            "metadata": meta,
            "summary": summary,
            "sections": sections,
            "recommendations": recs,
            "data_sources": data_sources,
        }
        all_recommendations.extend(recs)
        all_data_sources.extend(data_sources)

        print(f"  Done: {len(sections)} sections, {len(recs)} recs ({parse_method})")

    # Generate JSON output
    print(f"\n{'=' * 50}")
    print("Generating JSON output files...")
    generate_json_output(all_plans_data, all_recommendations, mma_data)

    # Summary
    plan_count = len(all_plans_data)
    section_count = sum(len(d["sections"]) for d in all_plans_data.values())
    rec_count = len(all_recommendations)
    ds_count = len(all_data_sources)

    print(f"\n{'=' * 60}")
    print("Pipeline v2.0 Complete!")
    print(f"  Plans processed: {plan_count}")
    print(f"  Sections extracted: {section_count}")
    print(f"  Recommendations extracted: {rec_count}")
    print(f"  Data source references: {ds_count}")
    print(f"  Municipalities loaded: {muni_count}")
    print(f"  Database: {DB_PATH}")
    print(f"  JSON output: {OUTPUT_DIR}")
    print(f"{'=' * 60}")

    conn.close()


if __name__ == "__main__":
    main()
