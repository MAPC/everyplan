import { NextRequest, NextResponse } from 'next/server';
import { searchPlans } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q');
    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: 'Search query parameter "q" is required' },
        { status: 400 }
      );
    }

    const filters: {
      municipality?: string;
      plan_type?: string;
      topic?: string;
    } = {};

    const municipality = searchParams.get('municipality');
    if (municipality) filters.municipality = municipality;

    const plan_type = searchParams.get('plan_type');
    if (plan_type) filters.plan_type = plan_type;

    const topic = searchParams.get('topic');
    if (topic) filters.topic = topic;

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const results = searchPlans(
      q,
      Object.keys(filters).length > 0 ? filters : undefined,
      limit
    );

    return NextResponse.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error searching plans:', error);
    return NextResponse.json(
      { error: 'Failed to search plans' },
      { status: 500 }
    );
  }
}
