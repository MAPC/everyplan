import { NextRequest, NextResponse } from 'next/server';
import { getPlans, getRecommendations, getSections } from '@/lib/db';

export const dynamic = 'force-dynamic';
import type { Plan, Recommendation, Section } from '@/lib/types';

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function plansToCsv(plans: Plan[]): string {
  const headers = [
    'id', 'plan_name', 'municipality', 'plan_type', 'year_adopted',
    'adoption_status', 'pdf_filename', 'consultant', 'mapc_involvement',
    'topics', 'summary', 'section_count', 'recommendation_count',
  ];
  const rows = plans.map(plan =>
    headers.map(h => {
      const value = plan[h as keyof Plan];
      if (Array.isArray(value)) return escapeCsvField(value.join('; '));
      return escapeCsvField(value);
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function recommendationsToCsv(recs: Recommendation[]): string {
  const headers = [
    'id', 'plan_id', 'municipality', 'plan_name', 'text', 'category',
    'priority', 'timeframe', 'responsible_party', 'topics',
  ];
  const rows = recs.map(rec =>
    headers.map(h => {
      const value = rec[h as keyof Recommendation];
      if (Array.isArray(value)) return escapeCsvField(value.join('; '));
      return escapeCsvField(value);
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function sectionsToCsv(sections: Section[]): string {
  const headers = [
    'id', 'plan_id', 'section_title', 'section_number', 'section_type',
    'page_start', 'page_end', 'topics', 'sort_order', 'content',
  ];
  const rows = sections.map(section =>
    headers.map(h => {
      const value = section[h as keyof Section];
      if (Array.isArray(value)) return escapeCsvField(value.join('; '));
      return escapeCsvField(value);
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || 'plans';
    const format = searchParams.get('format') || 'json';

    // Build filters from query params
    const filters: {
      municipality?: string;
      plan_type?: string;
      year_min?: number;
      year_max?: number;
      status?: string;
      topic?: string;
      category?: string;
      priority?: string;
    } = {};

    const municipality = searchParams.get('municipality');
    if (municipality) filters.municipality = municipality;

    const plan_type = searchParams.get('plan_type');
    if (plan_type) filters.plan_type = plan_type;

    const year_min = searchParams.get('year_min');
    if (year_min) filters.year_min = parseInt(year_min, 10);

    const year_max = searchParams.get('year_max');
    if (year_max) filters.year_max = parseInt(year_max, 10);

    const status = searchParams.get('status');
    if (status) filters.status = status;

    const topic = searchParams.get('topic');
    if (topic) filters.topic = topic;

    const category = searchParams.get('category');
    if (category) filters.category = category;

    const priority = searchParams.get('priority');
    if (priority) filters.priority = priority;

    let data: unknown;
    let csvContent: string;
    let filename: string;

    switch (type) {
      case 'plans': {
        const plans = getPlans(filters);
        data = plans;
        csvContent = plansToCsv(plans);
        filename = 'everyplan-plans';
        break;
      }
      case 'recommendations': {
        const recs = getRecommendations(filters);
        data = recs;
        csvContent = recommendationsToCsv(recs);
        filename = 'everyplan-recommendations';
        break;
      }
      case 'sections': {
        // Sections require a plan context; get all plans matching filters, then collect sections
        const plans = getPlans(filters);
        const allSections: Section[] = [];
        for (const plan of plans) {
          const sections = getSections(plan.id);
          allSections.push(...sections);
        }
        data = allSections;
        csvContent = sectionsToCsv(allSections);
        filename = 'everyplan-sections';
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Invalid export type. Must be one of: plans, recommendations, sections' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON download
    const jsonContent = JSON.stringify(data, null, 2);
    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
