'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, FileText } from 'lucide-react';
import type { SearchResult } from '@/lib/types';

interface SearchClientProps {
  initialQuery: string;
  initialResults: SearchResult[];
  municipalities: string[];
}

export default function SearchClient({ initialQuery, initialResults, municipalities }: SearchClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [muniFilter, setMuniFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams({ q: query.trim() });
      if (muniFilter) params.set('municipality', muniFilter);
      router.push(`/search?${params.toString()}`);
    }
  };

  // Group results by plan
  const grouped = initialResults.reduce<Record<string, { plan_name: string; municipality: string; results: SearchResult[] }>>((acc, r) => {
    if (!acc[r.plan_id]) {
      acc[r.plan_id] = { plan_name: r.plan_name, municipality: r.municipality, results: [] };
    }
    acc[r.plan_id].results.push(r);
    return acc;
  }, {});

  return (
    <div>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search across all plans... (e.g., "trails", "wetlands", "ADA")'
            className="w-full pl-12 pr-28 py-3.5 rounded-xl bg-white border shadow-sm focus:outline-none focus:ring-2 focus:ring-teal text-base"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal text-white px-5 py-2 rounded-lg font-medium hover:bg-forest transition-colors text-sm">
            Search
          </button>
        </div>
      </form>

      {/* Filter controls */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        {initialQuery && (
          <span className="text-sm text-ep-secondary">
            {initialResults.length} result{initialResults.length !== 1 ? 's' : ''} for &ldquo;{initialQuery}&rdquo;
          </span>
        )}
      </div>

      {showFilters && (
        <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-ep-secondary mb-1">Municipality</label>
            <select value={muniFilter} onChange={e => setMuniFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {muniFilter && (
            <button onClick={() => setMuniFilter('')} className="flex items-center gap-1 text-sm text-coral hover:underline">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {!initialQuery ? (
        <div className="text-center py-16 text-ep-secondary">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-2">Search across all municipal plans</p>
          <p className="text-sm">Enter a search term to find relevant sections, recommendations, and data.</p>
        </div>
      ) : initialResults.length === 0 ? (
        <div className="text-center py-16 text-ep-secondary">
          <p className="text-lg mb-2">No results found</p>
          <p className="text-sm">Try different keywords or broaden your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([planId, group]) => (
            <div key={planId} className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue" />
                <Link href={`/plans/${planId}`} className="font-medium text-navy hover:text-blue">
                  {group.municipality} — {group.plan_name}
                </Link>
                <span className="text-xs text-ep-secondary ml-auto">{group.results.length} match{group.results.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.results.map((result, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-gray-50">
                    <Link href={`/plans/${result.plan_id}#section-${result.section_id}`}>
                      <div className="text-sm font-medium text-blue mb-1">{result.section_title}</div>
                      <div
                        className="text-sm text-ep-secondary leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                      {result.page_start && (
                        <div className="text-xs text-gray-400 mt-1">Page {result.page_start}</div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
