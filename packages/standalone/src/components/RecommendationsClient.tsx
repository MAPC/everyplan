'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X, Download, Lightbulb, FileText, ExternalLink } from 'lucide-react';
import type { Recommendation } from '@/lib/types';
import { RECOMMENDATION_CATEGORIES, TOPIC_FAMILIES, PLAN_TYPES } from '@/lib/types';

interface Props {
  recommendations: Recommendation[];
  municipalities: string[];
  categories: string[];
  planTypes?: string[];
  planTypeMap?: Record<string, string>;
  initialFilters?: Record<string, string>;
}

export default function RecommendationsClient({ recommendations, municipalities, categories, planTypes = [], planTypeMap = {}, initialFilters = {} }: Props) {
  const [muniFilter, setMuniFilter] = useState(initialFilters.municipality || '');
  const [planTypeFilter, setPlanTypeFilter] = useState(initialFilters.plan_type || '');
  const [catFilter, setCatFilter] = useState(initialFilters.category || '');
  const [topicFilter, setTopicFilter] = useState(initialFilters.topic || '');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(Object.keys(initialFilters).length > 0);
  const [visibleCount, setVisibleCount] = useState(50);

  // Collect all topics from recommendations
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const r of recommendations) for (const t of r.topics) set.add(t);
    return Array.from(set).sort();
  }, [recommendations]);

  const activeFilterCount = [muniFilter, planTypeFilter, catFilter, topicFilter].filter(Boolean).length;

  const filtered = useMemo(() => {
    let result = [...recommendations];
    if (muniFilter) result = result.filter(r => r.municipality === muniFilter);
    if (planTypeFilter) result = result.filter(r => planTypeMap[r.plan_id] === planTypeFilter);
    if (catFilter) result = result.filter(r => r.category === catFilter);
    if (topicFilter) result = result.filter(r => r.topics.includes(topicFilter));
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(r => r.text.toLowerCase().includes(q));
    }
    return result;
  }, [recommendations, muniFilter, planTypeFilter, catFilter, topicFilter, searchText, planTypeMap]);

  // Category counts
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of filtered) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Municipality', 'Plan', 'Category', 'Priority', 'Recommendation', 'Source Section', 'Page', 'PDF URL'];
    const rows = filtered.map(r => [r.municipality, r.plan_name, r.category, r.priority || '', r.text, r.source_section_title || '', r.source_page_start || '', r.pdf_url || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'everyplan_recommendations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Filter recommendations..."
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="bg-teal text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export
        </button>
        <span className="text-sm text-ep-secondary ml-auto">{filtered.length} recommendation{filtered.length !== 1 ? 's' : ''}</span>
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
          <div>
            <label className="block text-xs font-medium text-ep-secondary mb-1">Plan Type</label>
            <select value={planTypeFilter} onChange={e => setPlanTypeFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {planTypes.map(t => <option key={t} value={t}>{PLAN_TYPES[t] || t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ep-secondary mb-1">Category</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {categories.map(c => {
                const catInfo = RECOMMENDATION_CATEGORIES[c];
                return <option key={c} value={c}>{catInfo?.label || c}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ep-secondary mb-1">Topic</label>
            <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">All</option>
              {allTopics.map(t => {
                const f = TOPIC_FAMILIES[t];
                return <option key={t} value={t}>{f?.label || t}</option>;
              })}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setMuniFilter(''); setPlanTypeFilter(''); setCatFilter(''); setTopicFilter(''); }} className="flex items-center gap-1 text-sm text-coral hover:underline">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      )}

      {/* Category summary badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const catInfo = RECOMMENDATION_CATEGORIES[cat];
          const isActive = catFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(isActive ? '' : cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive ? 'ring-2 ring-offset-1 ring-teal' : ''
              } ${catInfo?.color || 'bg-gray-100 text-gray-700'}`}
            >
              {catInfo?.label || cat}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ep-secondary">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No recommendations match your filters.</p>
          </div>
        ) : (
          <>
            {filtered.slice(0, visibleCount).map((rec) => {
              const catInfo = RECOMMENDATION_CATEGORIES[rec.category];
              return (
                <div key={rec.id} className="bg-white rounded-lg border p-4 border-l-4 border-l-coral hover:shadow-sm transition-shadow">
                  <p className="text-sm text-ep-text leading-relaxed">{rec.text}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Link href={`/plans/${rec.plan_id}`} className="text-xs text-blue hover:underline font-medium">
                      {rec.municipality} — {rec.plan_name}
                    </Link>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                      {catInfo?.label || rec.category}
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
                    {rec.timeframe && (
                      <span className="text-xs text-ep-secondary">{rec.timeframe}</span>
                    )}
                  </div>
                  {/* Source citation */}
                  {(rec.source_section_title || rec.source_page_start) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <FileText className="w-3 h-3 text-ep-secondary/60" />
                      {rec.source_section_title && (
                        <Link
                          href={`/plans/${rec.plan_id}#section-${rec.source_section_id}`}
                          className="text-xs text-ep-secondary hover:text-blue hover:underline truncate max-w-[250px]"
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
              );
            })}
            {filtered.length > visibleCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setVisibleCount(v => v + 50)}
                  className="px-6 py-2 bg-white border rounded-lg text-sm text-blue hover:bg-gray-50"
                >
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
