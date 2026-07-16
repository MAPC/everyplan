import { getPlans, getMunicipalities } from '@/lib/db';
import PlansClient from '@/components/PlansClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function PlansPage({ searchParams }: PageProps) {
  const plans = getPlans();
  const municipalities = getMunicipalities();

  // Parse URL params for initial filter state
  const initialFilters: Record<string, string> = {};
  if (typeof searchParams.municipality === 'string') initialFilters.municipality = searchParams.municipality;
  if (typeof searchParams.plan_type === 'string') initialFilters.plan_type = searchParams.plan_type;
  if (typeof searchParams.status === 'string') initialFilters.status = searchParams.status;
  if (typeof searchParams.year === 'string') initialFilters.year = searchParams.year;
  if (typeof searchParams.consultant === 'string') initialFilters.consultant = searchParams.consultant;
  if (typeof searchParams.topic === 'string') initialFilters.topic = searchParams.topic;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-navy">Plan Database</h1>
        <p className="text-ep-secondary mt-1">Browse, filter, and export all indexed municipal plans.</p>
      </div>
      <PlansClient plans={plans} municipalities={municipalities} initialFilters={initialFilters} />
    </div>
  );
}
