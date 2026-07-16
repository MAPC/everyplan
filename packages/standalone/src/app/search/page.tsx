import { searchPlans, getMunicipalities } from '@/lib/db';
import SearchClient from '@/components/SearchClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { q?: string; municipality?: string; topic?: string };
}

export default function SearchPage({ searchParams }: PageProps) {
  const query = searchParams.q || '';
  const results = query ? searchPlans(query, {
    municipality: searchParams.municipality || undefined,
    topic: searchParams.topic || undefined,
  }) : [];
  const municipalities = getMunicipalities().filter(m => m.has_plan);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SearchClient
        initialQuery={query}
        initialResults={results}
        municipalities={municipalities.map(m => m.name)}
      />
    </div>
  );
}
