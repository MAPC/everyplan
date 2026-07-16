import { getPlan, getSections, getRecommendations, getDataSources } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PlanDetailClient from '@/components/PlanDetailClient';
import { TOPIC_FAMILIES, PLAN_TYPES, PLAN_TYPE_COLORS } from '@/lib/types';
import { ExternalLink, FileText, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function PlanDetailPage({ params }: PageProps) {
  const plan = getPlan(params.id);
  if (!plan) notFound();

  const sections = getSections(params.id);
  const recommendations = getRecommendations({ municipality: plan.municipality });
  const dataSources = getDataSources(params.id);

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm text-ep-secondary">
            <Link href="/plans" className="hover:text-blue">Plans</Link>
            <span className="mx-2">→</span>
            <Link href={`/plans?municipality=${encodeURIComponent(plan.municipality)}`} className="hover:text-blue">{plan.municipality}</Link>
            <span className="mx-2">→</span>
            <span className="text-navy font-medium">{plan.plan_name}</span>
          </nav>
        </div>
      </div>

      {/* Plan Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium text-navy">{plan.plan_name}</h1>
              <p className="text-lg text-blue mt-1">{plan.municipality}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {plan.year_adopted && (
                  <span className="text-sm text-ep-secondary">Year: {plan.year_adopted}</span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  plan.adoption_status === 'adopted' ? 'bg-tag-green-bg text-tag-green-text' :
                  plan.adoption_status === 'draft' ? 'bg-tag-amber-bg text-tag-amber-text' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {plan.adoption_status}
                </span>
                <Link
                  href={`/plans/types/${PLAN_TYPE_COLORS[plan.plan_type]?.slug || plan.plan_type}`}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${PLAN_TYPE_COLORS[plan.plan_type]?.pill || 'bg-tag-blue-bg text-tag-blue-text'}`}
                >
                  {PLAN_TYPES[plan.plan_type] || plan.plan_type}
                </Link>
                {plan.consultant && (
                  <span className="text-sm text-ep-secondary flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {plan.consultant}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {plan.topics.map(t => {
                  const f = TOPIC_FAMILIES[t];
                  return f ? (
                    <Link key={t} href={`/recommendations?topic=${encodeURIComponent(t)}`}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}>
                      {f.label}
                    </Link>
                  ) : null;
                })}
              </div>
              {/* Source links */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {plan.pdf_url && (
                  <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue hover:underline">
                    <FileText className="w-3.5 h-3.5" />
                    View Original PDF
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {plan.municipal_url && (
                  <a href={plan.municipal_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue hover:underline">
                    <Building2 className="w-3.5 h-3.5" />
                    Municipal Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="text-center px-4 py-2 bg-ep-bg rounded-lg">
                <div className="text-xl font-semibold text-navy">{plan.section_count}</div>
                <div className="text-xs text-ep-secondary">Sections</div>
              </div>
              <div className="text-center px-4 py-2 bg-ep-bg rounded-lg">
                <div className="text-xl font-semibold text-coral">{plan.recommendation_count}</div>
                <div className="text-xs text-ep-secondary">Recommendations</div>
              </div>
              {dataSources.length > 0 && (
                <div className="text-center px-4 py-2 bg-ep-bg rounded-lg">
                  <div className="text-xl font-semibold text-teal">{dataSources.length}</div>
                  <div className="text-xs text-ep-secondary">Data Sources</div>
                </div>
              )}
            </div>
          </div>
          {plan.summary && (
            <p className="mt-4 text-sm text-ep-secondary leading-relaxed max-w-3xl">{plan.summary}</p>
          )}
        </div>
      </div>

      {/* Content with sidebar */}
      <PlanDetailClient sections={sections} recommendations={recommendations} dataSources={dataSources} planName={plan.plan_name} />
    </div>
  );
}
