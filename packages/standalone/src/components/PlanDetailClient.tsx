'use client';

import { useState, useRef, useEffect } from 'react';
import type { Section, Recommendation, DataSource } from '@/lib/types';
import { TOPIC_FAMILIES } from '@/lib/types';
import { ChevronRight, List, BookOpen, Lightbulb, Database } from 'lucide-react';
import Link from 'next/link';

interface PlanDetailClientProps {
  sections: Section[];
  recommendations: Recommendation[];
  dataSources: DataSource[];
  planName: string;
}

export default function PlanDetailClient({ sections, recommendations, dataSources, planName }: PlanDetailClientProps) {
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'content' | 'recommendations' | 'sources'>('content');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Group sections by type
  const sectionsByType = sections.reduce<Record<string, Section[]>>((acc, s) => {
    const type = s.section_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'content' ? 'bg-white text-navy shadow-sm' : 'text-ep-secondary hover:text-navy'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Plan Text ({sections.length} sections)
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'recommendations' ? 'bg-white text-navy shadow-sm' : 'text-ep-secondary hover:text-navy'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Recommendations ({recommendations.length})
        </button>
        {dataSources.length > 0 && (
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sources' ? 'bg-white text-navy shadow-sm' : 'text-ep-secondary hover:text-navy'
            }`}
          >
            <Database className="w-4 h-4" />
            Data Sources ({dataSources.length})
          </button>
        )}
      </div>

      {activeTab === 'content' ? (
        <div className="flex gap-6">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-lg border p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
              <h3 className="text-xs font-medium text-ep-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <List className="w-3.5 h-3.5" /> Table of Contents
              </h3>
              <nav className="space-y-0.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block w-full text-left px-2 py-1.5 text-xs rounded transition-colors truncate ${
                      activeSection === section.id
                        ? 'bg-blue/10 text-blue font-medium'
                        : 'text-ep-secondary hover:text-navy hover:bg-gray-50'
                    }`}
                    title={section.section_title}
                  >
                    {section.section_number && (
                      <span className="text-ep-secondary mr-1">{section.section_number}</span>
                    )}
                    {section.section_title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {sections.map((section) => (
              <div
                key={section.id}
                ref={el => { sectionRefs.current[section.id] = el; }}
                className="mb-8 bg-white rounded-lg border p-6"
                id={`section-${section.id}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-lg font-medium text-navy">
                    {section.section_number && (
                      <span className="text-blue mr-2">{section.section_number}</span>
                    )}
                    {section.section_title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-ep-secondary whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      section.section_type === 'goals' ? 'bg-tag-coral-bg text-tag-coral-text' :
                      section.section_type === 'recommendations' ? 'bg-tag-coral-bg text-tag-coral-text' :
                      section.section_type === 'inventory' ? 'bg-tag-green-bg text-tag-green-text' :
                      section.section_type === 'analysis' ? 'bg-tag-blue-bg text-tag-blue-text' :
                      section.section_type === 'introduction' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {section.section_type}
                    </span>
                    {section.page_start && (
                      <span>p. {section.page_start}{section.page_end !== section.page_start ? `–${section.page_end}` : ''}</span>
                    )}
                  </div>
                </div>

                {/* Topic badges */}
                {section.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {section.topics.map(t => {
                      const f = TOPIC_FAMILIES[t];
                      return f ? (
                        <Link key={t} href={`/recommendations?topic=${encodeURIComponent(t)}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}>
                          {f.label}
                        </Link>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Section content */}
                <div className="plan-content text-sm text-ep-text leading-relaxed whitespace-pre-wrap">
                  {section.content.length > 3000
                    ? section.content.substring(0, 3000) + '...'
                    : section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'recommendations' ? (
        /* Recommendations Tab */
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-ep-secondary">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No recommendations extracted from this plan.</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg border p-4 border-l-4 border-l-coral">
                <p className="text-sm text-ep-text leading-relaxed">{rec.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tag-coral-bg text-tag-coral-text">
                    {rec.category}
                  </span>
                  {rec.priority && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-tag-amber-bg text-tag-amber-text' :
                      'bg-tag-green-bg text-tag-green-text'
                    }`}>
                      {rec.priority} priority
                    </span>
                  )}
                  {rec.timeframe && (
                    <span className="text-xs text-ep-secondary">Timeframe: {rec.timeframe}</span>
                  )}
                  {rec.topics.map(t => {
                    const f = TOPIC_FAMILIES[t];
                    return f ? (
                      <Link key={t} href={`/recommendations?topic=${encodeURIComponent(t)}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}>
                        {f.label}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Data Sources Tab */
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Year</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataSources.map((ds) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-navy font-medium">{ds.source_name}</td>
                  <td className="px-4 py-3 text-sm text-ep-secondary hidden sm:table-cell">{ds.source_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ep-secondary hidden md:table-cell">{ds.year || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ep-secondary hidden md:table-cell">{ds.page_number ? `p. ${ds.page_number}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
