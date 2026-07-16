'use client';

import Link from 'next/link';
import { FileText, ListChecks } from 'lucide-react';
import type { Plan } from '@/lib/types';
import { PLAN_TYPES } from '@/lib/types';
import TopicBadge from './TopicBadge';

interface PlanCardProps {
  plan: Plan;
  onTopicClick?: (topic: string) => void;
}

function AdoptionStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let colorClasses: string;

  if (normalized === 'adopted' || normalized === 'approved') {
    colorClasses = 'bg-tag-green-bg text-tag-green-text';
  } else if (normalized === 'draft') {
    colorClasses = 'bg-tag-amber-bg text-tag-amber-text';
  } else if (normalized === 'expired') {
    colorClasses = 'bg-gray-100 text-gray-500';
  } else {
    colorClasses = 'bg-tag-blue-bg text-tag-blue-text';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}
    >
      {status}
    </span>
  );
}

export default function PlanCard({ plan, onTopicClick }: PlanCardProps) {
  const planTypeLabel = PLAN_TYPES[plan.plan_type] || plan.plan_type;

  return (
    <Link href={`/plans/${plan.id}`} className="block group">
      <article className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-teal shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-teal mb-0.5">
                {plan.municipality}
              </p>
              <h3 className="text-base font-semibold text-navy group-hover:text-blue transition-colors leading-snug line-clamp-2">
                {plan.plan_name}
              </h3>
            </div>
            <AdoptionStatusBadge status={plan.adoption_status} />
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-ep-secondary mb-3">
            <span className="inline-flex items-center gap-1">
              {planTypeLabel}
            </span>
            {plan.year_adopted && (
              <>
                <span aria-hidden="true" className="text-gray-300">|</span>
                <span>{plan.year_adopted}</span>
              </>
            )}
            {plan.section_count !== undefined && (
              <>
                <span aria-hidden="true" className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {plan.section_count} section{plan.section_count === 1 ? '' : 's'}
                </span>
              </>
            )}
            {plan.recommendation_count !== undefined && (
              <>
                <span aria-hidden="true" className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {plan.recommendation_count} rec{plan.recommendation_count === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>

          {/* Summary */}
          {plan.summary && (
            <p className="text-sm text-ep-text mb-3 line-clamp-2 leading-relaxed">
              {plan.summary}
            </p>
          )}

          {/* Topics */}
          {plan.topics && plan.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.topics.slice(0, 6).map((topic) => (
                <TopicBadge
                  key={topic}
                  topic={topic}
                  onClick={
                    onTopicClick
                      ? () => {
                          onTopicClick(topic);
                        }
                      : undefined
                  }
                />
              ))}
              {plan.topics.length > 6 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-ep-secondary">
                  +{plan.topics.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
