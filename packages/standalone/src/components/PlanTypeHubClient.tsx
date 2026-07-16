'use client';

import { useState } from 'react';
import type { Recommendation } from '@/lib/types';
import { TOPIC_FAMILIES } from '@/lib/types';
import { Lightbulb, Database, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PlanTypeHubClientProps {
  recommendations: Recommendation[];
  recsByCategory: Record<string, number>;
  topDataSources: Array<{ source_name: string; count: number }>;
  planTypeLabel: string;
}

export default function PlanTypeHubClient({
  recommendations,
  recsByCategory,
  topDataSources,
  planTypeLabel,
}: PlanTypeHubClientProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'data_sources'>('recommendations');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAllRecs, setShowAllRecs] = useState(false);

  const categories = Object.entries(recsByCategory).sort((a, b) => b[1] - a[1]);
  const filteredRecs = categoryFilter === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === categoryFilter);
  const displayedRecs = showAllRecs ? filteredRecs : filteredRecs.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 bg-ep-bg p-1.5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'recommendations' ? 'bg-white text-navy shadow-sm' : 'text-ep-secondary hover:text-navy'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Recommendations ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('data_sources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'data_sources' ? 'bg-white text-navy shadow-sm' : 'text-ep-secondary hover:text-navy'
          }`}
        >
          <Database className="w-4 h-4" />
          Top Data Sources ({topDataSources.length})
        </button>
      </div>

      {activeTab === 'recommendations' ? (
        <div>
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => { setCategoryFilter('all'); setShowAllRecs(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === 'all' ? 'bg-navy text-white' : 'bg-gray-100 text-ep-secondary hover:bg-gray-200'
              }`}
            >
              All ({recommendations.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === cat ? 'bg-coral text-white' : 'bg-gray-100 text-ep-secondary hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          {/* Recommendations list */}
          <div className="space-y-3">
            {displayedRecs.map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg border p-4 border-l-4 border-l-coral">
                <p className="text-sm text-ep-text leading-relaxed">{rec.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Link href={`/plans/${rec.plan_id}`} className="text-xs text-blue font-medium hover:underline">
                    {rec.municipality}
                  </Link>
                  <span className="text-ep-secondary/30">|</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tag-coral-bg text-tag-coral-text">
                    {rec.category}
                  </span>
                  {rec.priority && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-tag-amber-bg text-tag-amber-text' :
                      'bg-tag-green-bg text-tag-green-text'
                    }`}>
                      {rec.priority}
                    </span>
                  )}
                  {rec.topics.slice(0, 3).map(t => {
                    const f = TOPIC_FAMILIES[t];
                    return f ? (
                      <Link key={t} href={`/recommendations?topic=${encodeURIComponent(t)}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}>
                        {f.label}
                      </Link>
                    ) : null;
                  })}
                </div>
                {/* Source citation */}
                {(rec.source_section_title || rec.source_page_start) && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    <FileText className="w-3 h-3 text-ep-secondary/60" />
                    {rec.source_section_title && (
                      <Link
                        href={`/plans/${rec.plan_id}#section-${rec.source_section_id}`}
                        className="text-xs text-ep-secondary hover:text-blue hover:underline truncate max-w-[200px]"
                        title={rec.source_section_title}
                      >
                        {rec.source_section_title}
                      </Link>
                    )}
                    {rec.source_page_start && (
                      <span className="text-xs text-ep-secondary/60">
                        p.{rec.source_page_start}{rec.source_page_end && rec.source_page_end !== rec.source_page_start ? `–${rec.source_page_end}` : ''}
                      </span>
                    )}
                    {rec.pdf_url && (
                      <a
                        href={rec.source_page_start ? `${rec.pdf_url}#page=${rec.source_page_start}` : rec.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-blue hover:underline ml-auto"
                      >
                        View PDF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show more/less */}
          {filteredRecs.length > 20 && (
            <button
              onClick={() => setShowAllRecs(!showAllRecs)}
              className="flex items-center gap-1 mx-auto mt-4 px-4 py-2 text-sm text-blue hover:underline"
            >
              {showAllRecs ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show all {filteredRecs.length} recommendations <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      ) : (
        /* Data Sources Tab */
        <div>
          <p className="text-sm text-ep-secondary mb-4">
            Most frequently referenced data sources across all {planTypeLabel} plans.
          </p>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Data Source</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider text-right">References</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden sm:table-cell">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topDataSources.map((ds, i) => {
                  const maxCount = topDataSources[0]?.count || 1;
                  const pct = Math.round((ds.count / maxCount) * 100);
                  return (
                    <tr key={ds.source_name} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal/10 text-teal text-xs flex items-center justify-center font-medium">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-navy">{ds.source_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ep-secondary text-right">{ds.count}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-teal/60 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
