import { NextRequest, NextResponse } from 'next/server';
import { getPlans } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: {
      municipality?: string;
      plan_type?: string;
      year_min?: number;
      year_max?: number;
      status?: string;
      topic?: string;
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

    const plans = getPlans(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
