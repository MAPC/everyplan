import Database from 'better-sqlite3';
import path from 'path';
import type { Plan, Section, Recommendation, Municipality, SearchResult, DashboardStats, DataSource } from './types';

const DB_PATH = path.join(process.cwd(), '..', '..', 'data', 'output', 'everyplan.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
  }
  return _db;
}

function parseTopics(topicsStr: string | null): string[] {
  if (!topicsStr) return [];
  try {
    return JSON.parse(topicsStr);
  } catch {
    return [];
  }
}

// ── Plans ──────────────────────────────────────────────────────────────────

export function getPlans(filters?: {
  municipality?: string;
  plan_type?: string;
  year_min?: number;
  year_max?: number;
  status?: string;
  topic?: string;
}): Plan[] {
  const db = getDb();
  let query = 'SELECT * FROM plans WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.municipality) {
    query += ' AND municipality = ?';
    params.push(filters.municipality);
  }
  if (filters?.plan_type) {
    query += ' AND plan_type = ?';
    params.push(filters.plan_type);
  }
  if (filters?.year_min) {
    query += ' AND year_adopted >= ?';
    params.push(filters.year_min);
  }
  if (filters?.year_max) {
    query += ' AND year_adopted <= ?';
    params.push(filters.year_max);
  }
  if (filters?.status) {
    query += ' AND adoption_status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY municipality, year_adopted DESC';

  const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

  return rows.map(row => {
    const plan: Plan = {
      id: row.id as string,
      plan_name: row.plan_name as string,
      municipality: row.municipality as string,
      plan_type: row.plan_type as string,
      year_adopted: row.year_adopted as number | null,
      adoption_status: row.adoption_status as string,
      pdf_filename: row.pdf_filename as string,
      pdf_url: row.pdf_url as string | null,
      municipal_url: row.municipal_url as string | null,
      consultant: row.consultant as string | null,
      mapc_involvement: Boolean(row.mapc_involvement),
      topics: parseTopics(row.topics as string),
      summary: row.summary as string | null,
    };

    // Add counts
    const sectionCount = db.prepare('SELECT COUNT(*) as count FROM sections WHERE plan_id = ?').get(plan.id) as { count: number };
    const recCount = db.prepare('SELECT COUNT(*) as count FROM recommendations WHERE plan_id = ?').get(plan.id) as { count: number };
    plan.section_count = sectionCount.count;
    plan.recommendation_count = recCount.count;

    if (filters?.topic) {
      const topics = plan.topics;
      if (!topics.includes(filters.topic!)) return null;
    }

    return plan;
  }).filter((p): p is Plan => p !== null);
}

export function getPlan(id: string): Plan | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;

  const sectionCount = db.prepare('SELECT COUNT(*) as count FROM sections WHERE plan_id = ?').get(id) as { count: number };
  const recCount = db.prepare('SELECT COUNT(*) as count FROM recommendations WHERE plan_id = ?').get(id) as { count: number };

  return {
    id: row.id as string,
    plan_name: row.plan_name as string,
    municipality: row.municipality as string,
    plan_type: row.plan_type as string,
    year_adopted: row.year_adopted as number | null,
    adoption_status: row.adoption_status as string,
    pdf_filename: row.pdf_filename as string,
    pdf_url: row.pdf_url as string | null,
    municipal_url: row.municipal_url as string | null,
    consultant: row.consultant as string | null,
    mapc_involvement: Boolean(row.mapc_involvement),
    topics: parseTopics(row.topics as string),
    summary: row.summary as string | null,
    section_count: sectionCount.count,
    recommendation_count: recCount.count,
  };
}

// ── Sections ──────────────────────────────────────────────────────────────

export function getSections(planId: string): Section[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM sections WHERE plan_id = ? ORDER BY sort_order').all(planId) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: row.id as string,
    plan_id: row.plan_id as string,
    section_title: row.section_title as string,
    section_number: row.section_number as string | null,
    content: row.content as string,
    page_start: row.page_start as number,
    page_end: row.page_end as number,
    topics: parseTopics(row.topics as string),
    section_type: row.section_type as string,
    template_section: row.template_section as string | null,
    sort_order: row.sort_order as number,
  }));
}

// ── Search ────────────────────────────────────────────────────────────────

export function searchPlans(query: string, filters?: {
  municipality?: string;
  plan_type?: string;
  topic?: string;
}, limit: number = 50): SearchResult[] {
  const db = getDb();

  // Clean query for FTS5
  const cleanQuery = query.replace(/[^\w\s"]/g, '').trim();
  if (!cleanQuery) return [];

  // Use FTS5 search
  let sql = `
    SELECT
      s.plan_id,
      p.plan_name,
      p.municipality,
      s.id as section_id,
      s.section_title,
      snippet(sections_fts, 2, '<mark>', '</mark>', '...', 40) as snippet,
      s.page_start,
      rank
    FROM sections_fts
    JOIN sections s ON sections_fts.rowid = s.rowid
    JOIN plans p ON s.plan_id = p.id
    WHERE sections_fts MATCH ?
  `;

  const params: unknown[] = [cleanQuery];

  if (filters?.municipality) {
    sql += ' AND p.municipality = ?';
    params.push(filters.municipality);
  }
  if (filters?.plan_type) {
    sql += ' AND p.plan_type = ?';
    params.push(filters.plan_type);
  }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  try {
    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    let results = rows.map(row => ({
      plan_id: row.plan_id as string,
      plan_name: row.plan_name as string,
      municipality: row.municipality as string,
      section_id: row.section_id as string,
      section_title: row.section_title as string,
      snippet: row.snippet as string,
      page_start: row.page_start as number,
      rank: row.rank as number,
    }));

    if (filters?.topic) {
      const topicVal = filters.topic;
      results = results.filter(r => {
        const section = db.prepare('SELECT topics FROM sections WHERE id = ?').get(r.section_id) as { topics: string } | undefined;
        if (!section) return false;
        const topics = parseTopics(section.topics);
        return topics.includes(topicVal);
      });
    }

    return results;
  } catch {
    // Fallback to LIKE search if FTS5 fails
    const likeQuery = `%${cleanQuery}%`;
    const fallbackSql = `
      SELECT
        s.plan_id,
        p.plan_name,
        p.municipality,
        s.id as section_id,
        s.section_title,
        substr(s.content, max(1, instr(lower(s.content), lower(?)) - 60), 200) as snippet,
        s.page_start
      FROM sections s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.content LIKE ?
      ORDER BY p.municipality
      LIMIT ?
    `;
    const rows = db.prepare(fallbackSql).all(cleanQuery, likeQuery, limit) as Array<Record<string, unknown>>;
    return rows.map(row => ({
      plan_id: row.plan_id as string,
      plan_name: row.plan_name as string,
      municipality: row.municipality as string,
      section_id: row.section_id as string,
      section_title: row.section_title as string,
      snippet: row.snippet as string,
      page_start: row.page_start as number,
    }));
  }
}

// ── Recommendations ───────────────────────────────────────────────────────

export function getRecommendations(filters?: {
  municipality?: string;
  plan_type?: string;
  category?: string;
  priority?: string;
  topic?: string;
}): Recommendation[] {
  const db = getDb();
  let sql = `
    SELECT r.*, p.municipality, p.plan_name, p.pdf_url,
      s.section_title as source_section_title, s.page_start as source_page_start, s.page_end as source_page_end
    FROM recommendations r
    JOIN plans p ON r.plan_id = p.id
    LEFT JOIN sections s ON r.source_section_id = s.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters?.municipality) {
    sql += ' AND p.municipality = ?';
    params.push(filters.municipality);
  }
  if (filters?.plan_type) {
    sql += ' AND p.plan_type = ?';
    params.push(filters.plan_type);
  }
  if (filters?.category) {
    sql += ' AND r.category = ?';
    params.push(filters.category);
  }
  if (filters?.priority) {
    sql += ' AND r.priority = ?';
    params.push(filters.priority);
  }

  sql += ' ORDER BY p.municipality, r.category';

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  let results = rows.map(row => ({
    id: row.id as string,
    plan_id: row.plan_id as string,
    text: row.text as string,
    category: row.category as string,
    priority: row.priority as string | null,
    timeframe: row.timeframe as string | null,
    responsible_party: row.responsible_party as string | null,
    source_section_id: row.source_section_id as string,
    topics: parseTopics(row.topics as string),
    municipality: row.municipality as string,
    plan_name: row.plan_name as string,
    source_section_title: row.source_section_title as string | undefined,
    source_page_start: row.source_page_start as number | undefined,
    source_page_end: row.source_page_end as number | undefined,
    pdf_url: row.pdf_url as string | undefined,
  }));

  if (filters?.topic) {
    const topicVal = filters.topic;
    results = results.filter(r => r.topics.includes(topicVal));
  }

  return results;
}

// ── Municipalities ────────────────────────────────────────────────────────

export function getMunicipalities(): Municipality[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM plans p WHERE p.municipality = m.name) as plan_count
    FROM municipalities m
    ORDER BY m.name
  `).all() as Array<Record<string, unknown>>;

  return rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    mapc_subregion: row.mapc_subregion as string,
    population: row.population as number,
    area_sq_miles: row.area_sq_miles as number,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    plan_count: row.plan_count as number,
    has_plan: (row.plan_count as number) > 0,
    city_or_town: row.city_or_town as string | undefined,
    population_density: row.population_density as number | undefined,
    county: row.county as string | undefined,
    form_of_government: row.form_of_government as string | undefined,
    income_per_capita: row.income_per_capita as number | undefined,
    median_home_value: row.median_home_value as number | undefined,
    median_gross_rent: row.median_gross_rent as number | undefined,
    total_households: row.total_households as number | undefined,
    average_household_size: row.average_household_size as number | undefined,
    registered_voters: row.registered_voters as number | undefined,
    owner_occupied_rate: row.owner_occupied_rate as number | undefined,
    residential_tax_rate: row.residential_tax_rate as number | undefined,
    commercial_tax_rate: row.commercial_tax_rate as number | undefined,
    average_tax_bill: row.average_tax_bill as number | undefined,
    regional_planning_agency: row.regional_planning_agency as string | undefined,
  }));
}

// ── Data Sources ─────────────────────────────────────────────────────────

export function getDataSources(planId: string): DataSource[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM data_sources WHERE plan_id = ? ORDER BY source_name').all(planId) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: row.id as string,
    plan_id: row.plan_id as string,
    section_id: row.section_id as string | null,
    source_name: row.source_name as string,
    source_type: row.source_type as string | null,
    year: row.year as string | null,
    page_number: row.page_number as number | null,
    url: row.url as string | null,
  }));
}

// ── Plan Type Hub Stats ──────────────────────────────────────────────────

export interface PlanTypeHubStats {
  plan_count: number;
  municipality_count: number;
  recommendation_count: number;
  data_source_count: number;
  section_count: number;
  adopted_count: number;
  recommendations_by_category: Record<string, number>;
  top_data_sources: Array<{ source_name: string; count: number }>;
  year_range: { min: number | null; max: number | null };
}

export function getPlanTypeHubStats(planType: string): PlanTypeHubStats {
  const db = getDb();

  const planCount = (db.prepare('SELECT COUNT(*) as c FROM plans WHERE plan_type = ?').get(planType) as { c: number }).c;
  const muniCount = (db.prepare('SELECT COUNT(DISTINCT municipality) as c FROM plans WHERE plan_type = ?').get(planType) as { c: number }).c;
  const recCount = (db.prepare('SELECT COUNT(*) as c FROM recommendations r JOIN plans p ON r.plan_id = p.id WHERE p.plan_type = ?').get(planType) as { c: number }).c;
  const dsCount = (db.prepare('SELECT COUNT(*) as c FROM data_sources d JOIN plans p ON d.plan_id = p.id WHERE p.plan_type = ?').get(planType) as { c: number }).c;
  const secCount = (db.prepare('SELECT COUNT(*) as c FROM sections s JOIN plans p ON s.plan_id = p.id WHERE p.plan_type = ?').get(planType) as { c: number }).c;
  const adoptedCount = (db.prepare("SELECT COUNT(*) as c FROM plans WHERE plan_type = ? AND adoption_status = 'adopted'").get(planType) as { c: number }).c;

  const catRows = db.prepare(`
    SELECT r.category, COUNT(*) as count
    FROM recommendations r JOIN plans p ON r.plan_id = p.id
    WHERE p.plan_type = ?
    GROUP BY r.category ORDER BY count DESC
  `).all(planType) as Array<{ category: string; count: number }>;
  const recsByCat: Record<string, number> = {};
  for (const r of catRows) recsByCat[r.category] = r.count;

  const dsRows = db.prepare(`
    SELECT d.source_name, COUNT(*) as count
    FROM data_sources d JOIN plans p ON d.plan_id = p.id
    WHERE p.plan_type = ?
    GROUP BY d.source_name ORDER BY count DESC LIMIT 10
  `).all(planType) as Array<{ source_name: string; count: number }>;

  const yearRange = db.prepare('SELECT MIN(year_adopted) as min_year, MAX(year_adopted) as max_year FROM plans WHERE plan_type = ? AND year_adopted IS NOT NULL').get(planType) as { min_year: number | null; max_year: number | null };

  return {
    plan_count: planCount,
    municipality_count: muniCount,
    recommendation_count: recCount,
    data_source_count: dsCount,
    section_count: secCount,
    adopted_count: adoptedCount,
    recommendations_by_category: recsByCat,
    top_data_sources: dsRows,
    year_range: { min: yearRange.min_year, max: yearRange.max_year },
  };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────

export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const totalPlans = (db.prepare('SELECT COUNT(*) as c FROM plans').get() as { c: number }).c;
  const totalSections = (db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }).c;
  const totalRecs = (db.prepare('SELECT COUNT(*) as c FROM recommendations').get() as { c: number }).c;
  const muniWithPlans = (db.prepare('SELECT COUNT(DISTINCT municipality) as c FROM plans').get() as { c: number }).c;
  const totalMunis = (db.prepare('SELECT COUNT(*) as c FROM municipalities').get() as { c: number }).c;

  // Plans by type
  const typeRows = db.prepare('SELECT plan_type, COUNT(*) as count FROM plans GROUP BY plan_type').all() as Array<{ plan_type: string; count: number }>;
  const plansByType: Record<string, number> = {};
  for (const r of typeRows) plansByType[r.plan_type] = r.count;

  // Plans by year
  const yearRows = db.prepare('SELECT year_adopted, COUNT(*) as count FROM plans WHERE year_adopted IS NOT NULL GROUP BY year_adopted ORDER BY year_adopted').all() as Array<{ year_adopted: number; count: number }>;
  const plansByYear: Record<string, number> = {};
  for (const r of yearRows) plansByYear[String(r.year_adopted)] = r.count;

  // Plans by status
  const statusRows = db.prepare('SELECT adoption_status, COUNT(*) as count FROM plans GROUP BY adoption_status').all() as Array<{ adoption_status: string; count: number }>;
  const plansByStatus: Record<string, number> = {};
  for (const r of statusRows) plansByStatus[r.adoption_status] = r.count;

  // Recommendations by category
  const catRows = db.prepare('SELECT category, COUNT(*) as count FROM recommendations GROUP BY category ORDER BY count DESC').all() as Array<{ category: string; count: number }>;
  const recsByCat: Record<string, number> = {};
  for (const r of catRows) recsByCat[r.category] = r.count;

  // Top topics across sections
  const allSections = db.prepare('SELECT topics FROM sections WHERE topics IS NOT NULL').all() as Array<{ topics: string }>;
  const topicCounts: Record<string, number> = {};
  for (const row of allSections) {
    const topics = parseTopics(row.topics);
    for (const t of topics) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  return {
    total_plans: totalPlans,
    total_sections: totalSections,
    total_recommendations: totalRecs,
    municipalities_with_plans: muniWithPlans,
    total_municipalities: totalMunis,
    plans_by_type: plansByType,
    plans_by_year: plansByYear,
    plans_by_status: plansByStatus,
    recommendations_by_category: recsByCat,
    top_topics: topTopics,
  };
}
