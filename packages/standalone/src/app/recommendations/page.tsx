import { getRecommendations, getMunicipalities, getPlans } from '@/lib/db';
import RecommendationsClient from '@/components/RecommendationsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function RecommendationsPage({ searchParams }: PageProps) {
  const recommendations = getRecommendations();
  const plans = getPlans();
  const municipalities = getMunicipalities().filter(m => m.has_plan).map(m => m.name);

  // Extract unique categories
  const categories = Array.from(new Set(recommendations.map(r => r.category))).sort();

  // Extract unique plan types from actual plans
  const planTypes = Array.from(new Set(plans.map(p => p.plan_type))).sort();

  // Build plan_id → plan_type lookup
  const planTypeMap: Record<string, string> = {};
  for (const p of plans) planTypeMap[p.id] = p.plan_type;

  // Parse URL params for initial filter state
  const initialFilters: Record<string, string> = {};
  if (typeof searchParams.topic === 'string') initialFilters.topic = searchParams.topic;
  if (typeof searchParams.municipality === 'string') initialFilters.municipality = searchParams.municipality;
  if (typeof searchParams.plan_type === 'string') initialFilters.plan_type = searchParams.plan_type;
  if (typeof searchParams.category === 'string') initialFilters.category = searchParams.category;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-navy">Recommendations Hub</h1>
        <p className="text-ep-secondary mt-1">
          Browse {recommendations.length} recommendations extracted from {municipalities.length} municipal plans.
          Filter by category, municipality, or topic.
        </p>
      </div>
      <RecommendationsClient
        recommendations={recommendations}
        municipalities={municipalities}
        categories={categories}
        planTypes={planTypes}
        planTypeMap={planTypeMap}
        initialFilters={initialFilters}
      />
    </div>
  );
}
