import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: {
      municipality?: string;
      plan_type?: string;
      category?: string;
      priority?: string;
      topic?: string;
    } = {};

    const municipality = searchParams.get('municipality');
    if (municipality) filters.municipality = municipality;

    const plan_type = searchParams.get('plan_type');
    if (plan_type) filters.plan_type = plan_type;

    const category = searchParams.get('category');
    if (category) filters.category = category;

    const priority = searchParams.get('priority');
    if (priority) filters.priority = priority;

    const topic = searchParams.get('topic');
    if (topic) filters.topic = topic;

    const recommendations = getRecommendations(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
