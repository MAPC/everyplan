# EveryPlan PRD Addendum v1.3

**Supplements:** EveryPlan Product Requirements Document v1.0
**Date:** March 2026
**Status:** Draft for Review

---

## Overview of Changes

This addendum documents requirements agreed upon during the MVP development process. It covers seventeen areas:

1. **Template-Guided PDF Parsing Pipeline** (rewrite of Section 6.1 / 9.1) — IMPLEMENTED
2. **Plan Type Hub Pages** (new feature, new routes) — IMPLEMENTED (OSRP)
3. **MMA Municipal Data Integration** (enhanced filtering) — IMPLEMENTED
4. **Source Traceability** (PDF links, page-level attribution) — IMPLEMENTED (rec citations done)
5. **Enhanced Plan Index Table** (new columns, advanced filters) — IMPLEMENTED
6. **Phase 2: Image/Figure/Map Extraction** (documented, deferred)
7. **Plan Type Template Configuration** (extensible parsing architecture) — IMPLEMENTED (OSRP)
8. **Plan Types Index Page** (new feature, nav link) — IMPLEMENTED
9. **Recommendation Source Citations and Type Tagging** — PARTIAL (citations done, type tagging next)
10. **Plan Reading View** (Full Text reader mode) — SUPERSEDED by §13 PDF Viewer
11. **Data Source Deduplication and Linking** — NEW
12. **Plan Submission / Upload** — NEW
13. **PDF Hosting and Embedded Viewer** (new, replaces raw text display) — NEW
14. **Phased Document Text Strategy** (roadmap for text quality) — NEW
15. **Recommendation Hierarchy and Table Extraction** — NEW
16. **Municipal Profiles and Home Page Enhancements** — NEW
17. **Visual Design and MAPC Brand Alignment** (documented for future) — NEW

---

## 1. Template-Guided PDF Parsing Pipeline

### 1.1 Problem Statement

The v1.0 pipeline uses pure heuristic heading detection (font size + bold + ALL-CAPS regex) to identify section boundaries. Testing against 9 OSRP PDFs revealed severe quality issues:

- **Over-segmentation:** Plans that should have ~30-50 sections instead produced 200-960 sections
- **Table cell pollution:** Individual table cells (numbers, percentages, column headers) were detected as section headings
- **Map glyph artifacts:** Vertically-rendered map labels extracted character-by-character (e.g., "S\nH\nA\nW\nS\nH\nE\nE\nN")
- **Mid-sentence fragments:** Bold text within paragraphs treated as section headings, splitting content
- **Encoding artifacts:** 407 occurrences of ligature characters and GIS symbol glyphs across 9 plans
- **TOC contamination:** Table-of-contents entries with dot-leaders treated as sections
- **Duplicate content:** Multiple false headings on the same page producing overlapping section content
- **Bad summaries:** Auto-generated summaries pulling from cover pages, acknowledgements, and footnotes instead of actual introductions

Estimated impact: ~2,500-3,000 of 3,685 sections are garbage or low quality.

### 1.2 Root Cause

The heading detection heuristics are too aggressive:
- ALL-CAPS regex (`^[A-Z][A-Z\s&]+$`) matches table headers, abbreviations, and city names
- Bold text threshold treats any bold text under 120 characters as a heading
- No table region exclusion
- No TOC detection
- Minimum section content threshold (20 chars) is far too low

### 1.3 New Architecture: Template-Guided Parsing

The rewritten pipeline uses **plan-type-specific structural templates** derived from state-mandated workbooks/guidelines as the primary parsing strategy, with heuristic detection as a fallback for content that doesn't match the template.

#### 1.3.1 Plan Type Templates

Each plan type has a canonical section structure defined by state guidelines. These templates are stored as configuration files and used to guide parsing.

**OSRP Template** (source: *Open Space and Recreation Planner's Workbook*, DCS, 2025 revision):

```
Section 1: Executive Summary
Section 2: Introduction
  A. Statement of Purpose
  B. Planning Process and Public Participation
  C. Enhanced Outreach and Public Participation (EJ)
Section 3: Community Setting
  A. Regional Context
  B. Population Characteristics
  C. Growth and Development Patterns
Section 4: Environmental Inventory and Analysis
  A. Soils and Topography
  B. Water Resources
  C. Vegetation
  D. Fisheries and Wildlife
  E. Scenic Resources and Unique Environments
  F. Climate Change Impacts
Section 5: Conservation and Recreation Lands Inventory
  - Municipally owned Conservation and Recreation Properties
  - Public properties (non-conservation/recreation departments)
  - Permanently Protected Private Parcels
  - Park and Open Space Equity
Section 6: Analysis of Needs
  A. Summary of Natural Resource Protection Needs
  B. Summary of Community's Outdoor Recreation Needs
  C. Management Needs
Section 7: Action Plan
Section 8: Public Comments
Section 9: References
Appendices (A through F, variable)
```

**Required Maps** (8 total, per OSRP Workbook):
1. Regional Context
2. Environmental Justice
3. Zoning
4. Soils
5. Water Resources
6. Unique Features
7. Climate Change
8. Inventory of Open Space

**HPP Template** (source: *DHCD Housing Production Plan Guidelines*, 760 CMR 56.03(4), Updated October 2020):
```
Section 1: Comprehensive Housing Needs Assessment
  A. Demographic and housing data (population, household types, tenure)
  B. Housing market analysis (sale prices, rents, affordability gaps)
  C. Building permit trends and development pipeline
  D. SHI status (Subsidized Housing Inventory, % toward 10% threshold)
Section 2: Development Constraints and Limitations
  A. Environmental constraints (wetlands, flood zones, water supply)
  B. Infrastructure capacity (water, sewer, roads, transit, schools)
  C. Regulatory barriers (zoning, permitting, density limits)
  D. Mitigation strategies for identified constraints
Section 3: Affordable Housing Goals
  A. Annual production targets (0.5% or 1.0% of year-round housing units for certification)
  B. Unit type mix (rental vs ownership, family vs senior, special needs)
  C. Timeline/schedule for achieving goals with specific milestones
Section 4: Identification of Development Locations
  A. Zoning districts suitable for housing development
  B. Specific sites for affordable housing (publicly owned, underutilized, TOD)
  C. Zoning changes needed (density increases, accessory apartments, mixed-use)
Section 5: Implementation Strategies
  A. Zoning reform strategies
  B. Housing production programs (LIP, Chapter 40R, inclusionary zoning)
  C. Funding strategies (CPA, HOME, CDBG, LIHTC, municipal bonds)
  D. Partnerships (developers, nonprofits, housing authorities, regional entities)
  E. Capacity building (housing trust, housing coordinator position)
```

**HPP Regulatory Context:**
- Regulatory authority: 760 CMR 56.00 (Chapter 40B regulations)
- Approval body: DHCD (Department of Housing and Community Development)
- Certification benefit: Municipality gains "safe harbor" from 40B Comprehensive Permits for 1 year (0.5% production) or 2 years (1.0% production)
- Plan validity: 5 years from DHCD approval
- Plans must be adopted by the municipality's Planning Board, approved by the Chief Executive Officer (Select Board/Mayor), and submitted to DHCD for review
- Contact: Jennifer Maddox, Undersecretary, DHCD / Phil DeMartino

**Digital Equity Plan Template** (source: MassTech Municipal Digital Equity Planning Program):
```
Section 1: Existing Conditions Assessment
Section 2: Stakeholder Engagement Findings
Section 3: Recommendations
  - Internet Availability and Affordability
  - Device Access
  - Digital Skills and Technical Support
```

#### 1.3.2 Parsing Strategy (Priority Order)

1. **Native PDF TOC** (`doc.get_toc()`): If the PDF has an embedded table of contents, use it as the primary section boundary source. Most professionally-produced plans include one.

2. **Template matching**: Attempt to match extracted headings against the plan type template using fuzzy string matching. Headings like "Section 3 - Community Setting" or "COMMUNITY SETTING" or "3. Community Setting" should all match the template entry. Assign `section_type` and `section_number` from the template.

3. **Heuristic heading detection** (tightened): For content not matched by TOC or template, apply heading heuristics with the following restrictions:
   - ALL-CAPS text must ALSO be above the body font size threshold
   - Reject headings that are purely numeric (`^\d[\d,.%]*$`)
   - Reject headings that end with comma, semicolon, or period-followed-by-lowercase (mid-sentence indicators)
   - Require minimum 3 words for ALL-CAPS headings
   - Bold text must be significantly larger than body text (not merely equal to it)
   - Headings must not appear within a detected table region

4. **Fallback**: Content that doesn't match any heading pattern is appended to the previous section.

#### 1.3.3 Table Detection and Extraction

- Use PyMuPDF's `page.find_tables()` to identify table regions on each page
- Exclude text within table bounding boxes from heading detection
- Extract table content as structured data (rows/columns) stored alongside the section
- Store tables as both structured JSON and a clean text representation
- Tag table content with metadata: column headers, row count, data types detected

#### 1.3.4 Text Quality Improvements

- **Encoding normalization**: Replace ligature characters (fi, fl, ff, ffi, ffl) with ASCII equivalents; strip GIS/map glyph artifacts
- **Vertical text detection**: Detect single-character-per-line sequences and either reconstruct the word or remove them
- **Page header/footer stripping**: More aggressive pattern matching for repeated plan title + page number patterns
- **TOC line detection**: Strip lines containing long runs of dots (`\.{4,}`) or page-number references
- **Minimum section size**: Raise from 20 characters to 200 characters; merge smaller sections into preceding section
- **Deduplication**: When multiple headings on the same page produce sections with >80% content overlap, keep only the first
- **Whitespace normalization**: Collapse excessive blank lines, normalize indentation

#### 1.3.5 Improved Summary Generation

- Skip sections classified as: cover page, acknowledgements, table of contents, appendix
- Prefer sections with `section_type` = "executive_summary" or "introduction"
- If no suitable section found, use the first section with `section_type` = "other" that has >200 characters and does not start with a date, address, or list of names
- Limit summary to first 500 characters of the selected section's content

#### 1.3.6 Improved Consultant Extraction

- Scan cover pages and introduction sections for patterns: "Prepared by:", "Consultant:", "Planning Consultant:", followed by a firm name
- Maintain a lookup table of known Massachusetts planning consultants (Horsley Witten Group, Stantec, MAPC, VHB, Weston & Sampson, RKG Associates, BSC Group, etc.)
- Match extracted text against the lookup table for higher confidence

#### 1.3.7 Pipeline Output Changes

The pipeline continues to output SQLite + JSON, but with these additions:
- New `tables` table in SQLite: `id, section_id, plan_id, page_number, headers (JSON), rows (JSON), caption`
- New `data_sources` table: `id, plan_id, section_id, source_name, source_type, year, page_number` (extracted references to datasets like Census, ACS, MassGIS, etc.)
- Updated `sections` table: add `template_section` field mapping to the canonical template section name
- Updated `plans` table: add `pdf_url`, `municipal_url`, `workbook_version` fields

#### 1.3.8 Template Configuration File Format

Templates are stored as JSON in `data/pipeline/templates/`:

```json
{
  "plan_type": "open_space_recreation",
  "plan_type_label": "Open Space & Recreation Plan",
  "source_workbook": "Open Space and Recreation Planner's Workbook (DCS, 2025)",
  "source_url": "https://www.mass.gov/doc/open-space-and-recreation-planners-workbook-with-appendices-updated-in-2025/download",
  "sections": [
    {
      "id": "executive_summary",
      "label": "Executive Summary",
      "section_number": "1",
      "match_patterns": ["executive summary", "section 1"],
      "section_type": "executive_summary",
      "required": true
    },
    {
      "id": "introduction",
      "label": "Introduction",
      "section_number": "2",
      "match_patterns": ["introduction", "section 2"],
      "section_type": "introduction",
      "required": true,
      "subsections": [
        {
          "id": "statement_of_purpose",
          "label": "Statement of Purpose",
          "match_patterns": ["statement of purpose", "purpose"],
          "subsection_letter": "A"
        },
        {
          "id": "planning_process",
          "label": "Planning Process and Public Participation",
          "match_patterns": ["planning process", "public participation"],
          "subsection_letter": "B"
        },
        {
          "id": "enhanced_outreach",
          "label": "Enhanced Outreach and Public Participation",
          "match_patterns": ["enhanced outreach", "environmental justice"],
          "subsection_letter": "C"
        }
      ]
    }
  ],
  "required_maps": [
    { "id": "regional_context", "label": "Regional Context", "map_number": 1 },
    { "id": "environmental_justice", "label": "Environmental Justice", "map_number": 2 },
    { "id": "zoning", "label": "Zoning", "map_number": 3 },
    { "id": "soils", "label": "Soils", "map_number": 4 },
    { "id": "water_resources", "label": "Water Resources", "map_number": 5 },
    { "id": "unique_features", "label": "Unique Features", "map_number": 6 },
    { "id": "climate_change", "label": "Climate Change", "map_number": 7 },
    { "id": "open_space_inventory", "label": "Inventory of Open Space", "map_number": 8 }
  ],
  "required_data_sources": [
    "U.S. Census / American Community Survey",
    "MassGIS",
    "USDA NRCS Soils Data",
    "BioMap (NHESP)",
    "MVP / Climate Change Projections",
    "EJ Dataviewer"
  ]
}
```

---

## 2. Plan Type Hub Pages

### 2.1 Purpose

Each plan type has a dedicated "hub" landing page that serves as:
- An overview of what this plan type is and why it matters
- A one-stop resource for planners drafting a new plan of this type
- An aggregated view of all indexed plans of this type with key extracted content
- A link to the state's official guidelines and workbooks

### 2.2 Route Structure

```
/plans                     # All plans index (all types)
/plans/types/osrp          # OSRP hub page
/plans/types/hpp           # Housing Production Plan hub (future)
/plans/types/dep           # Digital Equity Plan hub (future)
/plans/types/[type-slug]   # Generic hub for any plan type
/plans/[id]                # Individual plan detail (unchanged)
```

### 2.3 Hub Page Template Structure

Each hub page follows a consistent template with flexibility for plan-type-specific content:

1. **Header**
   - Plan type name and icon
   - Brief description from state guidelines
   - Key stat badges (plans indexed, municipalities covered, recommendations extracted)

2. **"Why This Plan Matters" Section**
   - Purpose and benefits of this plan type
   - Funding eligibility enabled by having an approved plan (e.g., DCS grants for OSRPs)
   - Link to state guidelines / workbook
   - Contact information for the relevant state office

3. **State Guidelines Reference**
   - Required section structure (from the plan type template)
   - Required maps/exhibits list
   - Key data sources needed
   - Link to download the official workbook/guidelines PDF

4. **Key Statistics Panel**
   - How many plans of this type are indexed
   - Municipality coverage
   - Topic distribution across plans of this type
   - Year distribution / timeline

5. **Recommendations Browser** (pre-filtered embed)
   - The existing Recommendations Hub view, pre-filtered to this plan type
   - Category breakdown specific to this plan type's recommendation taxonomy

6. **Figures & Visualizations Gallery** (Phase 2 - see Section 6)
   - Extracted charts, graphs, and figures from plans of this type
   - Tagged by figure type and topic
   - Intended to show planners examples of visualizations they'll need to produce

7. **Data Sources Inventory**
   - All datasets referenced across plans of this type
   - Organized by section (which section of the plan uses which data)
   - Links to data sources where available (MassGIS, Census, ACS, etc.)

8. **Maps Gallery** (Phase 2 - see Section 6)
   - Extracted maps from plans of this type
   - Tagged by required map type (per workbook)

9. **External Resources**
   - Link to state overview/guidelines page
   - Link to workbook PDF
   - Links to relevant MAPC tools (e.g., HPP Data Tool at hpp.mapc.org)
   - Links to existing aggregation sites (e.g., MassTech DEP portal)

### 2.4 Plan Type Tag in Index Table

The Plan Type column in the plans index table (`/plans`) displays the plan type as a **clickable badge/tag** that navigates to the corresponding hub page. For example, clicking the "Open Space & Recreation" tag on Burlington's row navigates to `/plans/types/osrp`.

### 2.5 OSRP Hub Page: Initial Content Sources

For the MVP OSRP hub page:

- **State overview content**: Sourced from https://www.mass.gov/info-details/open-space-and-recreation-plans
  - OSRP purpose and community resource management benefits
  - DCS grant program eligibility (up to 10 years with approved OSRP)
  - Review/approval process (4-step workflow via Melissa Cryan at DCS)
  - Link to the Planner's Workbook (2025 revision) with appendices

- **Contact information**: Melissa Cryan, Division of Conservation Services
  - Email: Melissa.Cryan@mass.gov
  - Phone: (857) 274-7173

- **Required structure**: 9 sections + 8 required maps (from workbook, see Section 1.3.1)

- **Recommendations**: Pre-filtered from existing recommendations database

- **Data sources**: Extracted from plan text during pipeline processing

### 2.6 Future Plan Type Hub Pages

The hub page template is designed to accommodate additional plan types as they are added:

**Housing Production Plans (HPPs)**
- State guidelines: DHCD Housing Production Plan Guidelines (760 CMR 56.03(4)), Updated October 2020
  - Full guidelines PDF: uploaded to project (`Guidelines - 2020.pdf`)
- MAPC resource: https://www.mapc.org/resource-library/whatishpp/
- Existing MAPC tool: HPP Data Tool (hpp.mapc.org) - Python/Docker app generating housing data charts
  - Source: https://github.com/MAPC/hpp
  - Archived chart generation library: https://github.com/MAPC/hpp-data-library
- 5 required sections: Needs Assessment, Constraints/Limitations, Goals, Development Locations, Strategies
- Key data sources: Census/ACS housing data, Chapter 40B Subsidized Housing Inventory (SHI), DHCD SHI database
- Certification: Municipality must produce SHI-eligible units equal to 0.5% (1-year safe harbor) or 1.0% (2-year safe harbor) of total year-round housing units
- Plan validity: 5 years; can be amended at any time
- Approval process: Planning Board adoption → CEO approval → DHCD 30-day completeness review → 90-day approval decision

**Digital Equity Plans (DEPs)**
- State program: MassTech Municipal Digital Equity Planning Program
- Aggregation portal: https://broadband.masstech.org/municipal (70+ plans available as PDFs)
- Two delivery formats: Digital Equity Charrette (8-hour workshop) or comprehensive Digital Equity Plan
- 3 core focus areas: Internet availability/affordability, Device access, Digital skills
- Some plans are regional (multi-municipality), unlike OSRPs which are per-municipality

---

## 3. MMA Municipal Data Integration

### 3.1 Data Source

Massachusetts Municipal Association Data Hub export (CSV):
https://www.mma.org/wp-content/uploads/wpallexport/exports/8561b3fa81b97c1eafee3d31839798c1/This-data-was-exported-from-MMA-Data-Hub-03-6-2026-17.csv

### 3.2 Data Fields Available (44 columns)

| Category | Fields |
|----------|--------|
| Identity | Title (municipality name), city_of_town_of, county |
| Demographics | population, population_density, registered_voters |
| Economics | income_per_capita, eqv_per_capita |
| Housing | owner_occupied_housing_unit_rate, median_value_of_owner_occupied_housing_units, median_gross_rent, total_households, average_household_size |
| Governance | form_of_government, mayor_type, city_manager_type, council_type, chief_municipal_official, policy_board, size_of_policy_board, legislative_body, size_of_council, length_of_mayoral_term_years |
| Elections | meet_date, meet_desc, elect_date, elect_desc |
| Geography | area, public_roads, regional_planning_agency |
| Fiscal | residential_tax_rate, commercial_tax_rate, average_tax_bill, total_expenditures, tax_levy, state_aid, local_receipts |
| CPA | year_enacted, surcharge, cpa-exemptions |
| History | incorporation_date |

### 3.3 Database Integration

- Import all 351 Massachusetts municipalities' MMA data into the `municipalities` table
- Add columns for all MMA fields to the municipalities table schema
- This expands the map and filtering capabilities to all MA municipalities, not just the 9 with plans
- MMA data is loaded during pipeline execution and can be refreshed by re-downloading the CSV

### 3.4 Filter UI Design

**Basic Filters** (always visible in filter panel):
- Municipality (dropdown)
- Plan Type (clickable tags linking to hub pages)
- Adoption Status (adopted / draft / expired / unknown)
- City/Town designation (dropdown: City or Town)
- Population range (preset buckets: <10k, 10k-25k, 25k-50k, 50k-100k, 100k+)

**Advanced Filters** (accordion/expandable panel):
- Users can add arbitrary filters by selecting a variable from the full set of MMA fields
- Each added filter shows the field name + a value/range input appropriate to the data type:
  - Numeric fields (population_density, income_per_capita, area, public_roads, tax rates, etc.): range slider or min/max inputs
  - Categorical fields (county, form_of_government, regional_planning_agency): dropdown select
  - Boolean fields (has CPA): toggle switch
  - Date fields (incorporation_date): year range
- Users can add multiple advanced filters simultaneously
- Advanced filter selections are reflected in URL query parameters for shareable links
- "Clear all filters" button resets both basic and advanced

---

## 4. Source Traceability

### 4.1 Purpose

Users must always be able to trace any content in EveryPlan back to its primary source document. This is critical both for trust and for cases where parsing produces imperfect results.

### 4.2 Plan-Level Source Links

Add to the `plans` database table and Plan interface:

| Field | Type | Description |
|-------|------|-------------|
| `pdf_url` | URL \| null | Direct download URL for the plan PDF (hosted by municipality or state) |
| `municipal_url` | URL \| null | URL of the municipality's planning page where the OSRP is published |

### 4.3 UI Requirements

- **Plan Detail page header**: Prominent "View Original PDF" button linking to `pdf_url` (opens in new tab). Secondary "Municipal Website" link to `municipal_url`.
- **Section-level attribution**: Each section in the Plan Detail view shows its source page range (e.g., "Pages 23-27") as a link that opens the PDF at the correct page (`pdf_url#page=23`).
- **Section fallback link**: A small "View in original PDF" link appears next to each section's content, providing a fallback for any content that may have been incorrectly parsed.
- **Recommendation source link**: Each recommendation card in the Recommendations Hub includes a "View source" link that navigates to the source section in the Plan Detail page, and a secondary link to the original PDF page.
- **Search result attribution**: Search result snippets include the source page range and a link to the original PDF.

---

## 5. Enhanced Plan Index Table

### 5.1 New Table Columns

Add the following columns to the plans index table at `/plans`:

| Column | Source | Notes |
|--------|--------|-------|
| Consultant | `plans.consultant` (improved extraction) | Planning firm that prepared the plan |
| Plan Type | `plans.plan_type` | Displayed as clickable badge linking to hub page |
| Population | `municipalities.population` (MMA data) | Municipality population |
| City/Town | `municipalities.city_of_town_of` (MMA data) | "City" or "Town" designation |

### 5.2 Column Visibility

Not all columns need to be visible by default. Use a column visibility toggle (like a gear icon) that lets users show/hide columns. Default visible: Municipality, Plan Name, Plan Type, Year, Status, Topics. Optional: Consultant, Population, City/Town, County, Sections, Recommendations.

### 5.3 Plan Type as Clickable Tag

The Plan Type column renders as a styled badge (using the plan type's color scheme) that functions as a link to the plan type hub page (`/plans/types/[slug]`). This provides a discoverable navigation path from the index table to the hub pages.

---

## 6. Phase 2: Image/Figure Extraction (Deferred)

### 6.1 Purpose

Extract visual assets (charts, graphs, maps, photographs, diagrams) from plan PDFs for display in the plan type hub pages. This enables the hub to serve as a resource showing planners examples of the visualizations they need to produce.

### 6.2 Approach (When Implemented)

#### 6.2.1 Raster Image Extraction
- Use PyMuPDF's `page.get_images()` to extract embedded raster images
- Save as PNG files with metadata: plan_id, page_number, dimensions

#### 6.2.2 Vector Chart Rendering
- For vector graphics (charts drawn with PDF path operators), render the page region as a high-resolution PNG (300dpi)
- Crop to the chart bounding box
- Note: Extracting as true SVG vectors is technically possible but produces raw paths without semantic labels; high-res rasterization is more practical

#### 6.2.3 Caption Association
- Scan text near image bounding boxes for caption patterns: "Figure X", "Fig. X", "Map X", "Table X", "Chart X"
- Associate captions with images by spatial proximity
- Accept that some images may not have detectable captions (flag for manual review)

#### 6.2.4 Image Classification and Tagging
Images should be tagged with metadata:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique image identifier |
| `plan_id` | FK | Parent plan |
| `page_number` | integer | Source page |
| `image_type` | enum | `chart` \| `graph` \| `map` \| `photo` \| `diagram` \| `unknown` |
| `caption` | string \| null | Extracted caption text |
| `figure_number` | string \| null | "Figure 3", "Map 2", etc. |
| `template_map_type` | string \| null | For maps: which of the 8 required OSRP maps this corresponds to |
| `topics` | string[] | Topic tags |
| `file_path` | string | Path to extracted image file |

Maps and charts/graphs must be tagged differently so users can filter/sort by type in the hub page galleries.

#### 6.2.5 Database Schema Addition

New `figures` table:
```sql
CREATE TABLE figures (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES plans(id),
  page_number INTEGER,
  image_type TEXT,  -- chart, graph, map, photo, diagram, unknown
  caption TEXT,
  figure_number TEXT,
  template_map_type TEXT,  -- links to required_maps in template config
  topics TEXT,  -- JSON array
  file_path TEXT,
  width INTEGER,
  height INTEGER
);
```

### 6.3 Deferral Rationale

Image extraction is deferred until the text/table parsing pipeline is robust. The current pipeline produces too many garbage sections, making it impossible to meaningfully associate extracted images with correct sections. Once the template-guided parser is working well:
1. Section boundaries will be accurate, enabling better image-section association
2. Table detection will distinguish tables from charts, reducing false positives
3. The hub page structure will be in place to display extracted images

---

## 7. Plan Type Template Configuration

### 7.1 Architecture

The template configuration system enables the pipeline to process any plan type by adding a new template JSON file. No code changes are required to support a new plan type.

```
data/
  pipeline/
    templates/
      open_space_recreation.json    # OSRP template (from DCS Workbook)
      housing_production.json       # HPP template (from DHCD guidelines)
      digital_equity.json           # DEP template (from MassTech program)
      ...
    process_plans.py               # Main pipeline script
    config.json                    # Maps PDF filenames to plan metadata + template
```

### 7.2 Pipeline Configuration File

`data/pipeline/config.json` maps each source PDF to its metadata and template:

```json
{
  "plans": [
    {
      "pdf_filename": "230208_ReadingOSRP2022-2029_wApp.pdf",
      "municipality": "Reading",
      "plan_name": "OSRP 2022-2029",
      "plan_type": "open_space_recreation",
      "year_adopted": 2022,
      "adoption_status": "adopted",
      "pdf_url": null,
      "municipal_url": null,
      "consultant": null
    }
  ]
}
```

The `plan_type` field references a template file in `data/pipeline/templates/`.

### 7.3 Extensibility

To add a new plan type:
1. Create a template JSON file in `data/pipeline/templates/` based on the state's official guidelines
2. Add plan entries to `data/pipeline/config.json` with the new `plan_type`
3. Place PDF files in the source directory
4. Run the pipeline -- it will use the template to guide parsing

### 7.4 Reference Materials

Templates should be developed from these authoritative sources:

| Plan Type | Guidelines Source | URL |
|-----------|-------------------|-----|
| OSRP | DCS Open Space and Recreation Planner's Workbook (2025) | https://www.mass.gov/doc/open-space-and-recreation-planners-workbook-with-appendices-updated-in-2025/download |
| OSRP | DCS OSRP Overview | https://www.mass.gov/info-details/open-space-and-recreation-plans |
| HPP | MAPC "What is an HPP?" | https://www.mapc.org/resource-library/whatishpp/ |
| HPP | MAPC HPP Data Tool | https://github.com/MAPC/hpp |
| DEP | MassTech Municipal Digital Equity Planning | https://broadband.masstech.org/municipal |

---

## 8. Plan Types Index Page

### 8.1 Purpose

A new top-level page at `/plans/types` that serves as a directory of all plan types in EveryPlan. It provides a navigable overview with summary stats, enabling users to discover and explore different plan types.

### 8.2 Navigation

Add "Plan Types" to the main nav bar, positioned between "Plans" and "Recommendations":

```
Map | Plans | Plan Types | Recommendations | Dashboard | About
```

### 8.3 Page Content

Each plan type is displayed as a card with:
- Plan type name and brief description
- Key stats: plans indexed, municipalities covered, recommendations extracted
- A "View Hub" button linking to the type's hub page (`/plans/types/[slug]`)
- For types not yet indexed: "Coming soon" label with a description

**Plan types to include (with status):**
| Plan Type | Slug | Status |
|-----------|------|--------|
| Open Space & Recreation Plan | `osrp` | Active (9 plans indexed) |
| Housing Production Plan | `hpp` | Placeholder (coming soon) |
| Digital Equity Plan | `dep` | Placeholder (coming soon) |
| Comprehensive Plan / Master Plan | `comp` | Placeholder (coming soon) |
| Hazard Mitigation Plan | `hmp` | Placeholder (coming soon) |
| Climate Action Plan | `cap` | Placeholder (coming soon) |

### 8.4 Route

```
/plans/types          # Plan Types index (NEW)
/plans/types/osrp     # OSRP Hub (existing)
/plans/types/hpp      # HPP Hub (placeholder)
/plans/types/dep      # DEP Hub (placeholder)
```

---

## 9. Recommendation Source Citations and Type Tagging

### 9.1 Source Citations on Recommendations

Every recommendation card must cite its source for trust and traceability:

- **Page number**: Display "p. 47" or "pp. 47-52" from `source_section.page_start/page_end`
- **Section link**: Clickable link navigating to the source section within the Plan Detail view
- **PDF link**: If the plan has a `pdf_url`, link directly to the PDF page (`pdf_url#page=47`)
- **Display format**: Small footer on each recommendation card: `Burlington OSRP · p. 47 · View in plan | View PDF`

### 9.2 Recommendation Type Tagging

Many OSRP action plans use a hierarchy of recommendation types. The pipeline should detect and preserve this:

| Type | Description | Detection Patterns |
|------|-------------|-------------------|
| `goal` | Broad desired outcome | `GOAL \d`, `Goal:`, leading text before objectives |
| `objective` | Measurable target under a goal | `OBJECTIVE`, `Objective \d`, `\d+\.\d+` |
| `action` | Specific implementable step | `Action \d`, `Action Item`, `Task` |
| `strategy` | Approach or method | `Strategy \d`, `Strategy:` |
| `policy` | Policy recommendation | `Policy \d`, `Policy:` |
| `other` | Unclassified | Default |

**Pipeline changes:**
- Add `rec_type` field to `recommendations` table: `goal`, `objective`, `action`, `strategy`, `policy`, `other`
- Parse prefix text to detect type (e.g., "GOAL 1:" → `goal`, "Objective A:" → `objective`)
- If a recommendation is part of a goal/objective hierarchy, link it to its parent goal via a `parent_rec_id` field

**UI changes:**
- Display rec_type as a subtle label on each recommendation card (e.g., small "Goal" or "Action" badge)
- Keep existing category tags (trails, conservation, etc.) as orthogonal — they describe *topic*, while rec_type describes *level of specificity*
- Do not add rec_type as a filter dimension initially (keep it simple)

### 9.3 Recommendation Quality Improvements — IMPLEMENTED

The content-density scanning for TOC-based plans (Reading, Woburn) was extracting non-recommendation content (demographic paragraphs, purpose statements). Fixed by:
- **Strict mode** for content-density-scanned sections: only extract structured items (numbered, bulleted, labeled), not plain paragraphs
- **Mega-section subsection scanning**: For sections spanning 30+ pages (entire plan bodies), scan for internal goal/action heading patterns (e.g., "SECTION VIII: GOALS AND OBJECTIVES") and extract only from those subsections
- **TOC-area skipping**: Skip heading matches in the first 5% of mega-section content (table of contents area)
- Results: Reading 153 junk recs → 75 clean recs; Woburn 0 recs → 71 recs; total 411 recommendations across 9 plans

---

## 10. Plan Reading View (Full Text Mode)

### 10.1 Problem

The current section card layout makes formatting issues more visible. PDF text extraction inherently produces messy output (broken line wraps, embedded headers/footers, table data mixed with prose). The card-per-section view amplifies these issues.

### 10.2 Solution: Dual View

Add a **"Reader" view toggle** alongside the existing section cards view:

- **Section Cards** (current): Individual collapsible cards per section with topic tags and section type labels. Good for navigation and browsing.
- **Reader Mode** (new): Continuous scrollable document view with section headings as anchor points. Renders the full plan text as a cleaned, flowing document with:
  - Section headings styled as `<h2>` / `<h3>` with anchor IDs for deep linking
  - Paragraph detection: join lines that don't end with sentence-ending punctuation
  - Cleaner handling of table-like content (monospace blocks or simple formatting)
  - A floating table of contents sidebar for navigation within the reader

### 10.3 Text Cleanup Improvements

Apply additional text cleanup in the pipeline:
- **Paragraph joining**: Lines that don't end with `.`, `!`, `?`, or `:` should be joined with the next line (they represent PDF line wraps)
- **Header/footer deduplication**: Detect and strip repeated text that appears on >50% of pages (plan title, page numbers, municipality name)
- **Table block detection**: Identify lines that are part of tabular data (consistent column alignment, short fixed-width entries) and either format as a simple table or quarantine into a collapsible block

---

## 11. Data Source Deduplication and Linking

### 11.1 Current Issues

- **Redundancy**: "EPA" appears 54 times for Burlington because it's detected on every page mentioning "EPA". Each per-section match creates a separate record.
- **No URLs**: Source names are extracted but not linked to the actual data portals.
- **Specificity**: "ACS" is extracted as a generic name rather than specific tables (e.g., "ACS Table B19013").

### 11.2 Deduplication Strategy

Change the data sources display from per-section-per-page entries to **per-plan aggregated entries**:

| Field | Description |
|-------|-------------|
| `source_name` | Canonical data source name |
| `reference_count` | Number of times referenced across sections |
| `page_numbers` | Array of pages where referenced |
| `sections` | Array of section titles where referenced |
| `url` | Link to the data source portal |

### 11.3 Known Data Source URLs

Add canonical URLs to the template config for each known data source:

| Source | URL |
|--------|-----|
| U.S. Census Bureau | https://data.census.gov |
| American Community Survey (ACS) | https://data.census.gov/cedsci |
| MassGIS | https://www.mass.gov/orgs/massgis |
| USDA NRCS Soils Data | https://websoilsurvey.nrcs.usda.gov |
| BioMap (NHESP) | https://www.mass.gov/info-details/biomap-the-future-of-conservation |
| MVP / Climate Projections | https://resilientma.mass.gov |
| EJ Dataviewer | https://www.mass.gov/info-details/environmental-justice-populations-in-massachusetts |
| MassDEP | https://www.mass.gov/orgs/massdep |
| FEMA Flood Maps | https://msc.fema.gov |
| EPA | https://www.epa.gov |
| USGS | https://www.usgs.gov |
| Mass Audubon | https://www.massaudubon.org/our-conservation-work/advocacy/shaping-the-future-of-your-community/losing-ground |
| MAPC DataCommon | https://datacommon.mapc.org |

### 11.4 Specificity Improvements

For ACS references, attempt regex extraction of specific table numbers (e.g., `B\d{5}`, `S\d{4}`, `DP\d{2}`) and append to the source name. Coverage will be partial but useful where available.

---

## 12. Plan Submission / Upload

### 12.1 Purpose

Enable users (municipal planners, consultants, community members) to contribute plans to EveryPlan by uploading PDFs directly through the web interface.

### 12.2 MVP Approach (Upload-to-Queue)

For MVP, implement a simple upload form that stores the PDF and metadata for manual pipeline processing:

**Upload form fields:**
| Field | Type | Required |
|-------|------|----------|
| Municipality | Dropdown (351 MA municipalities) | Yes |
| Plan Type | Dropdown (OSRP, HPP, DEP, etc.) | Yes |
| Plan Name | Text input | Yes |
| Year Adopted | Number input | No |
| Adoption Status | Dropdown (adopted, draft, unknown) | No |
| PDF File | File upload (.pdf, max 100MB) | Yes |
| Submitter Email | Email input | Yes |
| Notes | Text area | No |

**Workflow:**
1. User fills out form and uploads PDF
2. System stores PDF in `data/uploads/` and metadata in a `submissions` table
3. Admin reviews submission and triggers pipeline processing manually
4. Processed plan appears in EveryPlan after pipeline run

### 12.3 UI Placement

- **Hub pages**: "Submit a Plan" button in the header area of each plan type hub page (e.g., "Submit an OSRP")
- **Per-municipality nudge**: On hub pages showing municipality coverage, municipalities without a plan show a subtle upload icon/prompt: "No [plan type] indexed for [Municipality]. Submit one?"
- **Navigation**: A small "Submit a Plan" link in the site footer

### 12.4 Future: Automated Processing

In a future iteration, uploaded PDFs could be automatically processed by the pipeline (running as a background job or serverless function). This requires:
- Pipeline exposed as a callable function (not just a CLI script)
- Background job queue (e.g., BullMQ, or a simple cron-based approach)
- Email notification to submitter when processing is complete
- Admin review/approval step before the plan goes live

---

## 13. PDF Hosting and Embedded Viewer

### 13.1 Problem Statement

The current approach of rendering extracted PDF text as section cards produces poor readability. Municipal plan PDFs have complex layouts (multi-column, sidebars, call-out boxes, tables, headers/footers) that are fundamentally difficult to reconstruct as HTML. Issues include:
- Sentences split across section cards
- Text not reading left-to-right due to multi-column extraction
- Page headers/footers mixed into body content
- Table data interleaved with prose
- Paragraph breaks lost or inserted incorrectly

Trying to achieve perfect HTML rendering of arbitrary PDF layouts is an unsolvable problem at this scale. The site's core value proposition is search, metadata, recommendations, and cross-plan comparison — not being a document reader.

### 13.2 Strategy: PDF-First with Enhanced Metadata

**Pivot the document reading experience to embedded PDF viewing**, while keeping all parsed/extracted data powering the rest of the site:

| Component | Source | Role |
|-----------|--------|------|
| Plan text reading | Embedded PDF viewer | Primary reading experience |
| Search | FTS5 on extracted text | Find content across plans |
| Recommendations | Extracted + tagged | Browsable, filterable, cross-plan |
| Data sources | Extracted + linked | Aggregated per plan and per type |
| Section navigation | Section index (title + page range) | "Jump to page X" in PDF viewer |
| Topic tags | Pipeline-assigned per section | Filter and discover content |
| Maps/figures | Phase 2 extraction | Visual gallery on hub pages |

### 13.3 PDF Hosting (MVP — Local Static Files)

For MVP, host PDFs as static files within the Next.js application:

1. Copy all source PDFs to `packages/standalone/public/pdfs/`
2. Set `pdf_url` in the pipeline to `/pdfs/[filename].pdf`
3. PDFs served directly by Next.js from the `public/` directory

**File organization:**
```
packages/standalone/public/
  pdfs/
    burlington-osrp-2019.pdf
    reading-osrp-2022.pdf
    ...
```

**Future (post-MVP):** Migrate PDFs to cloud storage (AWS S3 or Cloudflare R2) for CDN delivery, especially as the number of plans grows. Store the full URL in `pdf_url`.

### 13.4 Embedded PDF Viewer

Build a plan reading view at `/plans/[id]/view` (or inline on the plan detail page) with:

- **PDF.js-based viewer** rendering the hosted PDF in-browser
- **Section sidebar**: Clickable section index (section title + page range) that scrolls the PDF to the corresponding page
- **Search within PDF**: pdf.js built-in text search, supplemented by FTS5 results highlighting
- **Page navigation**: Page number input, prev/next buttons
- **Deep linking**: URL hash `#page=47` opens directly to that page
- **"View Original PDF"** button to download/open the full PDF
- **Responsive design**: Works on mobile with collapsible sidebar

### 13.5 Section Cards: Transition to Navigation Aids

Transform existing section cards on the plan detail page from text display to **navigation aids**:

| Current | New |
|---------|-----|
| Full section text rendered in card | Section title + page range + topic tags |
| Card is the reading experience | Card links to that page in the PDF viewer |
| Formatting issues visible | User reads the original formatted PDF |

Section cards remain useful for:
- Seeing the plan's structure at a glance
- Topic-based browsing (which sections cover which topics)
- Quick access to the recommendation, data source, and template section metadata
- Search result context (search hits link to the section → PDF page)

### 13.6 Plan Detail Page Layout (Updated)

```
┌─────────────────────────────────────────┐
│ Plan Header                             │
│ Municipality · Plan Type · Year · Status│
│ [View PDF] [Municipal Website]          │
├────────────┬────────────────────────────┤
│ Tabs:      │                            │
│ Sections   │ (Content area)             │
│ Recs       │                            │
│ Sources    │                            │
│ PDF Viewer │                            │
├────────────┴────────────────────────────┤
│ Sections Tab: Section cards as nav aids │
│ PDF Tab: Embedded pdf.js viewer         │
│   with section sidebar                  │
└─────────────────────────────────────────┘
```

---

## 14. Phased Document Text Strategy

### 14.1 Rationale

Perfect document parsing from varied PDF layouts is a "hairy problem." Rather than blocking on it, adopt a phased approach that delivers immediate value while building toward the eventual goal of structured, searchable HTML text.

### 14.2 Phase 1: PDF Hosting + Enhanced Metadata (Current Sprint)

**Goal:** Users can read plans in their original format with enhanced navigation and search.

- Host PDFs and embed a viewer (Section 13)
- Section index as navigation aids linking to PDF pages
- All extracted metadata (recommendations, data sources, topics, sections) continues to power search, filtering, and cross-plan features
- Users can always access the original document for any content
- **This phase solves the readability problem entirely** by not trying to reconstruct HTML from PDF text

### 14.3 Phase 2: Improved Text Extraction (Future)

**Goal:** Higher-quality extracted text for better search results and section content.

Improvements to the pipeline extraction:
- **Switch to `pdfplumber`** for layout-aware text extraction (better column detection, reading order)
- **Header/footer deduplication**: Detect repeated text at consistent coordinates across pages; strip before content extraction
- **Paragraph reconstruction**: Join lines broken by page wraps (lines not ending in `.!?:` joined to next line)
- **Column detection**: Identify two-column layouts and extract each column separately
- **Table region quarantine**: Detect tabular content and either format as HTML `<table>` or skip during text extraction

### 14.4 Phase 3: Structured HTML Output (Aspirational)

**Goal:** "Constitute"-style searchable, structured text representation for every plan.

- **Layout analysis**: Use ML-based document understanding (e.g., LayoutLM, Docling, or cloud document AI) to identify document structure: headings, paragraphs, lists, tables, captions, sidebars
- **Semantic HTML generation**: Convert identified regions to proper HTML (`<h2>`, `<p>`, `<ul>`, `<table>`, `<aside>`)
- **Per-plan editing**: Allow manual corrections to extracted HTML (admin tool)
- **Dual view**: Show structured HTML alongside the original PDF for comparison
- **Quality scoring**: Automated quality metrics per plan (extraction confidence score) to flag plans that need manual review

### 14.5 Technology Candidates for Phase 3

| Tool | Type | Strengths |
|------|------|-----------|
| Adobe PDF Services API | Cloud API | Best-in-class PDF → structured HTML |
| Google Document AI | Cloud API | Good layout analysis, table extraction |
| AWS Textract | Cloud API | Strong table extraction |
| Docling (IBM) | Open source | Document understanding, runs locally |
| Marker | Open source | PDF → Markdown with layout detection |
| pdfplumber | Python library | Good column/table detection, runs locally |
| Unstructured.io | Open source | Document partitioning into elements |

For an MAPC-hosted tool, privacy/cost considerations favor open-source options (Docling, Marker, pdfplumber) for Phase 2, with cloud APIs as Phase 3 options for highest quality.

---

## 15. Recommendation Hierarchy and Table Extraction

### 15.1 Problem Statement

Recommendations in OSRPs (and other plan types) commonly use a nested hierarchy:

```
GOAL 1: Protect Natural Resources
  Objective 1.A: Preserve wetland areas
    Action 1.A.1: Conduct wetland delineation study
    Action 1.A.2: Apply for grant funding for restoration
  Objective 1.B: Improve water quality
    Action 1.B.1: Implement stormwater management plan
```

The current pipeline flattens this hierarchy, losing the goal→objective→action relationships. Additionally, many plans include action plan summary tables (often in Section 7 or appendices) with structured columns:

```
| Action | Responsible Party | Timeframe | Priority | Funding |
|--------|-------------------|-----------|----------|---------|
| ...    | Conservation Comm | 1-3 years | High     | LAND    |
```

These tables contain the cleanest, most structured recommendations but are currently not extracted.

### 15.2 Hierarchy Extraction

**Pipeline changes:**
- Detect "Goal N" / "Objective N.X" / "Action N.X.Y" numbering patterns
- Store `rec_type` field: `goal`, `objective`, `action`, `strategy`, `policy`, `other`
- Store `parent_rec_id` linking actions to their parent objective/goal
- Preserve numbering in a `rec_number` field (e.g., "1.A.2")

**UI changes:**
- Indent objectives under goals, actions under objectives in the recommendations view
- Show rec_type as a small badge (Goal / Objective / Action)
- Allow filtering by rec_type in the recommendations browser

### 15.3 Action Plan Table Extraction

**Pipeline changes:**
- Use `pdfplumber` (better table extraction than PyMuPDF) to detect and parse structured tables in:
  - Sections tagged as "action_plan" or "goals"
  - Appendix sections with table content
- Map table columns to recommendation fields:
  - "Action" / "Recommendation" / "Strategy" → `text`
  - "Responsible Party" / "Lead" / "Department" → `responsible_party`
  - "Timeframe" / "Timeline" / "Target Date" → `timeframe`
  - "Priority" / "Importance" → `priority`
  - "Funding" / "Resources" / "Cost" → stored in a new `funding_source` field
- Deduplicate table-extracted recs against text-extracted recs (fuzzy match on text similarity)

### 15.4 Recommendation Formatting Cleanup

Common formatting issues in extracted recommendations:
- Stray tabs and whitespace from PDF column alignment
- Mixed numbering formats ("1.", "1)", "a.", "A.", "i.", "-", "•")
- Headers or subheadings embedded in recommendation text
- Recommendations split across page breaks

**Fixes:**
- Strip leading numbering/bullets during extraction (already partially done)
- Detect and separate embedded subheadings (lines that are ALL-CAPS or short + followed by longer content)
- Join recommendations split by page breaks (detect continuation by checking if text ends mid-sentence)
- Normalize whitespace: collapse multiple spaces/tabs to single space

---

## 16. Municipal Profiles and Home Page Enhancements

### 16.1 Problem Statement

The Municipal Coverage section on the home page currently displays municipality cards but doesn't provide interactivity. Users should be able to quickly find a municipality and see its plans.

### 16.2 Phase 1: Click-Through to Filtered Plans (Current Sprint)

The simplest, highest-value change:
- Make each municipality name/card on the home page clickable
- Clicking navigates to `/plans?municipality=Burlington` (the plans page with that municipality pre-filtered)
- Add a search/filter input to the Municipal Coverage section to quickly find a municipality by name
- The map view should also support this: clicking a dot navigates to the filtered plans page

### 16.3 Phase 2: Municipality Profile Pages (Future)

If demand warrants, create dedicated municipality profile pages at `/municipalities/[name]`:

**Page content:**
- Municipality header: name, city/town designation, population, county, RPA
- Link to the municipality's planning department website
- Cards for each indexed plan (with links to plan detail pages)
- Coverage matrix: which plan types has this municipality submitted?
- Key MMA data (demographics, fiscal data, governance)

**Considerations:**
- 351 pages is manageable with Next.js dynamic routes (`/municipalities/[name]/page.tsx`)
- Pages are lightweight (pulling from existing database data)
- SEO benefit: municipalities can link to their profile as a planning resource aggregator
- Start with a subset (municipalities with indexed plans) and expand as more plans are added

### 16.4 Home Page Improvements

- **Municipal Coverage section**: Add search/filter by name; show "X of 351 municipalities with plans indexed"
- **Featured plan types**: Link to the Plan Types index page
- **Recent additions**: Show recently indexed plans (useful as the collection grows)
- **Call to action**: "Submit a Plan" link for municipalities not yet covered

---

## 17. Visual Design and MAPC Brand Alignment

### 17.1 Reference Materials

Two style guides have been provided for future reference:

1. **MAPC Formatting and Visual Guide (2016)**
   - Colors: MAPC Green (#78BE20), MAPC Blue (#012169), Logo Green (#C7E2AD), Logo Blue (#004A91), Clean Energy Yellow (#E8BA1C), Handout Orange (#F47B20)
   - Fonts: Open Sans (headings), Rockwell (headings), TW Century MT (body)
   - Logos: MAPC logo, reverse logo, council logo, 8 subregion logos

2. **MetroCommon 2050 Brand Guidelines**
   - Fonts: Swift (serif, primary), Calibre (sans-serif, secondary)
   - Color palette: Tone-on-tone hues across warm reds/yellows, fuchsia/purple, greens/teals, blues
   - Graphic elements: Arrow motif, topic theme treatments
   - WCAG 2.0 accessibility compliance emphasized

3. **MAPC Logos** (ZIP files with various formats provided)

### 17.2 Current Design Assessment

The current EveryPlan design uses a civic tech / open government aesthetic inspired by the Sunlight Foundation style. Key elements:
- Navy (#1a365d) as primary dark color — close to MAPC Blue (#012169)
- Teal/green accents — different from MAPC Green (#78BE20) but harmonious
- Inter / system sans-serif fonts — clean and readable
- Minimal, card-based UI with subtle borders and shadows
- Coral accent for recommendations — distinctive, not from MAPC palette

### 17.3 Future Alignment Opportunities (Not Current Sprint)

If/when EveryPlan becomes an official MAPC-branded tool, these changes would align the design:

| Change | Effort | Impact |
|--------|--------|--------|
| Swap navy to MAPC Blue (#012169) | Low | Strong brand alignment |
| Add MAPC Green (#78BE20) as primary accent (replace teal) | Low | Brand recognition |
| Switch body font to Open Sans | Low | MAPC standard; free and widely available |
| Add MAPC logo to footer with "A project of MAPC" | Low | Attribution and credibility |
| Use MC2050 color palette for data visualizations | Medium | Consistency with MetroCommon materials |
| Adopt Swift/Calibre for headings (MC2050 guide) | Medium | Only if licensing available |
| Add subregion logos where relevant (filtering by MAPC subregion) | Low | Regional identity |

### 17.4 Design Principles (Retained)

These principles from the current design should be preserved regardless of brand alignment:
- **Readability first**: High contrast, generous whitespace, WCAG AA compliance
- **Civic tech aesthetic**: Clean, trustworthy, data-forward — not corporate
- **Progressive disclosure**: Simple by default, detailed on demand (accordion filters, expandable sections)
- **Mobile responsive**: All features usable on mobile devices

---

## Updated Data Model

### Additions to `plans` table

| Field | Type | Description |
|-------|------|-------------|
| `pdf_url` | URL \| null | Direct download URL for plan PDF |
| `municipal_url` | URL \| null | Municipality's planning page URL |
| `workbook_version` | string \| null | Version of state workbook used (e.g., "DCS 2025") |

### Additions to `municipalities` table

All 44 MMA Data Hub fields (see Section 3.2), covering demographics, economics, governance, geography, and fiscal data for all 351 MA municipalities.

### New `tables` table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique table identifier |
| `section_id` | FK | Parent section |
| `plan_id` | FK | Parent plan |
| `page_number` | integer | Source page in PDF |
| `headers` | JSON | Column header labels |
| `rows` | JSON | Array of row data |
| `caption` | string \| null | Table caption if detected |

### New `data_sources` table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `plan_id` | FK | Parent plan |
| `section_id` | FK \| null | Section where referenced |
| `source_name` | string | Dataset name (e.g., "American Community Survey") |
| `source_type` | string | census, state_gis, federal, local, other |
| `year` | string \| null | Data year if specified |
| `page_number` | integer \| null | Page where referenced |
| `url` | URL \| null | URL to access the data source |

### New `figures` table (Phase 2)

See Section 6.2.5.

### Updated `sections` table

| Field | Type | Description |
|-------|------|-------------|
| `template_section` | string \| null | Canonical template section ID (e.g., "environmental_inventory") |

---

## Updated Route Structure

```
/                              # Home / Landing (enhanced Municipal Coverage)
/map                           # Interactive Map (DataCommon style)
/plans                         # Plan Index (enhanced table with advanced filters)
/plans/types                   # Plan Types Index Page (NEW)
/plans/types/osrp              # OSRP Hub Page
/plans/types/hpp               # HPP Hub Page (future)
/plans/types/dep               # DEP Hub Page (future)
/plans/types/[type-slug]       # Generic plan type hub
/plans/[id]                    # Plan Detail (with PDF source links + embedded viewer)
/plans/[id]/view               # PDF Viewer (full-page, optional standalone route)
/municipalities/[name]         # Municipality Profile (Phase 2)
/search                        # Full-Text Search
/recommendations               # Recommendations Hub (with source citations)
/dashboard                     # Dashboard
/about                         # About
```

**Navigation bar:**
```
Map | Plan Types | Plans | Recommendations | Dashboard | About
```

---

## Implementation Priority

### Completed
1. ~~Pipeline rewrite~~ (§1) — template-guided parsing, tightened heuristics
2. ~~Database schema updates~~ — new tables, MMA data import, source link fields
3. ~~OSRP hub page~~ (§2) — first plan type hub with full content
4. ~~Enhanced index table~~ (§5) — consultant column, clickable plan type tags, advanced MMA filters
5. ~~Plan Types index page~~ (§8) — nav link, card-based directory
6. ~~Recommendation source citations~~ (§9.1) — section link, page number, PDF link on every rec card
7. ~~Recommendation quality~~ (§9.3) — strict mode + mega-section scanning for Reading/Woburn

### Current Sprint
8. **PDF hosting + embedded viewer** (§13) — host PDFs, build pdf.js viewer, section navigation
9. **Section cards → navigation aids** (§13.5) — transform plan detail from text display to PDF navigation
10. **Municipal click-through** (§16.2) — municipality names link to filtered plans page

### Next Sprint
11. **Recommendation hierarchy** (§15.2) — goal/objective/action tree, rec_type tagging
12. **Action plan table extraction** (§15.3) — pdfplumber-based structured table parsing
13. **Data source deduplication** (§11) — aggregate per plan, add canonical URLs
14. **Plan submission form** (§12) — upload-to-queue workflow

### Future
15. *(Phase 2)* Improved text extraction with pdfplumber (§14.3)
16. *(Phase 2)* Municipality profile pages (§16.3)
17. *(Phase 2)* Image/figure/map extraction (§6)
18. *(Phase 2)* Visual brand alignment with MAPC guides (§17)
19. *(Phase 3)* Structured HTML output — "Constitute"-style reading experience (§14.4)

---

## Project Organization and Deployment

### File Organization

All project files should be consolidated under `~/Desktop/EveryPlan MVP/`:

```
EveryPlan MVP/
├── packages/standalone/          # Next.js application
│   ├── public/pdfs/              # Hosted plan PDFs (NEW)
│   └── src/                      # Application source
├── data/
│   ├── pdfs/                     # Source PDF files (pipeline input)
│   ├── pipeline/                 # Python pipeline scripts + templates
│   ├── output/                   # SQLite database + JSON output
│   └── uploads/                  # User-submitted PDFs (future)
├── docs/                         # PRD, style guides, reference documents
│   ├── style-guides/             # MAPC + MC2050 style guide PDFs
│   └── reference/                # HPP guidelines, OSRP workbook appendices
├── assets/                       # Logos, media content
│   ├── mapc-logos/               # MAPC logo files (from ZIP)
│   └── ...
└── CLAUDE.md                     # Project context file
```

The pipeline should reference PDFs from `data/pdfs/` (within the project) rather than external paths like `~/Desktop/NSPC_OSRPs/`.

### Deployment Roadmap

**Phase 0: Local Development (Current)**
- Developers run `npm run dev` locally
- SQLite database generated by Python pipeline
- No external dependencies

**Phase 1: GitHub Repository + Colleague Testing**
- Push to MAPC GitHub organization
- README with setup instructions (Node.js, Python, dependencies)
- Colleagues clone and run locally
- PDFs either included in repo (if size allows) or downloaded separately

**Phase 2: Quick Preview Deployment**
Options for shareable web preview (in order of simplicity):
1. **Vercel** (free tier): Automatic deployment from GitHub, but SQLite file needs special handling (read from bundled file or switch to hosted DB)
2. **Cloudflare Pages + D1**: Static deployment + serverless SQLite (D1 is Cloudflare's SQLite-compatible DB)
3. **Railway / Render**: Simple container deployment, supports Node.js + SQLite file
4. **AWS Lightsail**: Quick EC2-like deployment for ~$5/mo

**Phase 3: Production (AWS EC2)**
- Deploy on MAPC's existing EC2 infrastructure
- Nginx reverse proxy → Next.js app
- SQLite file served from EBS volume (or migrate to PostgreSQL for multi-user writes)
- PDF files served from S3 + CloudFront CDN
- CI/CD via GitHub Actions

### GitHub Repository Setup Checklist

When ready to create the repo:
- [ ] Consolidate all files under `EveryPlan MVP/`
- [ ] Move PDFs from `~/Desktop/NSPC_OSRPs/` to `data/pdfs/`
- [ ] Update pipeline paths to use relative `data/pdfs/` path
- [ ] Add `.gitignore` (node_modules, .next, __pycache__, *.pyc, .env)
- [ ] Consider `.gitattributes` with Git LFS for PDF files (if including in repo)
- [ ] Write README with prerequisites and setup instructions
- [ ] Add `package.json` scripts for common operations
- [ ] Pin Node.js and Python versions in `.tool-versions` or similar

---

## Open Questions Resolved

| Question (from PRD v1.0 Section 14) | Resolution |
|--------------------------------------|------------|
| GeoJSON Source | Using DataCommon's ma-munis.json (351 municipalities) enriched with plan data |
| Branding | EveryPlan design system implemented per Appendix B; DataCommon map style adopted for /map. MAPC style guides documented for future alignment (§17) |
| Content Review | PDF hosting (§13) provides authoritative reading experience; extracted data powers search/recs/metadata |
| Document text quality | Phased approach adopted (§14): PDF viewer now, improved extraction later, structured HTML aspirational |

## New Open Questions

- Should the OSRP hub page eventually link to or embed MassGIS dataviewers for the 8 required map types?
- For HPPs, should EveryPlan integrate with or link to MAPC's existing HPP Data Tool (hpp.mapc.org)?
- For DEPs, should EveryPlan ingest plans from the MassTech portal (70+ PDFs) or link to it?
- Should plan type templates be editable via an admin UI, or are JSON config files sufficient?
- For GitHub: should PDFs be stored in the repo (via Git LFS) or downloaded separately? LFS adds complexity but keeps everything in one place.
- For preview deployment: Vercel is simplest but SQLite bundling has gotchas. Is Railway/Render acceptable for initial testing?
- Should the pipeline eventually run as a GitHub Action (triggered by PDF upload to a specific branch/folder)?
