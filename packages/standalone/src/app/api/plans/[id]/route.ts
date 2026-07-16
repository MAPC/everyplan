import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getSections, getRecommendations } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = getPlan(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    const sections = getSections(id);
    const recommendations = getRecommendations({ municipality: plan.municipality });
    const planRecommendations = recommendations.filter(r => r.plan_id === id);

    return NextResponse.json({
      ...plan,
      sections,
      recommendations: planRecommendations,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}
