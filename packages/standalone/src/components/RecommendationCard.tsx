'use client';

import Link from 'next/link';
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import type { Recommendation } from '@/lib/types';
import { RECOMMENDATION_CATEGORIES } from '@/lib/types';
import TopicBadge from './TopicBadge';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onTopicClick?: (topic: string) => void;
}

function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();
  let colorClasses: string;
  let icon: React.ReactNode = null;

  if (normalized === 'high') {
    colorClasses = 'bg-tag-coral-bg text-coral';
    icon = <AlertTriangle className="h-3 w-3" />;
  } else if (normalized === 'medium') {
    colorClasses = 'bg-tag-amber-bg text-amber';
  } else {
    colorClasses = 'bg-tag-green-bg text-teal';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClasses}`}
    >
      {icon}
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cat = RECOMMENDATION_CATEGORIES[category] || {
    color: 'bg-gray-100 text-gray-700',
    label: category,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}
    >
      {cat.label}
    </span>
  );
}

export default function RecommendationCard({
  recommendation,
  onTopicClick,
}: RecommendationCardProps) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Top row: category and priority */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <CategoryBadge category={recommendation.category} />
          <div className="flex items-center gap-2">
            {recommendation.priority && (
              <PriorityBadge priority={recommendation.priority} />
            )}
            {recommendation.timeframe && (
              <span className="inline-flex items-center gap-1 text-xs text-ep-secondary">
                <Clock className="h-3 w-3" />
                {recommendation.timeframe}
              </span>
            )}
          </div>
        </div>

        {/* Recommendation text */}
        <p className="text-sm text-ep-text leading-relaxed mb-3 line-clamp-3">
          {recommendation.text}
        </p>

        {/* Topics */}
        {recommendation.topics && recommendation.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {recommendation.topics.slice(0, 4).map((topic) => (
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
            {recommendation.topics.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-ep-secondary">
                +{recommendation.topics.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Source info and link */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-ep-secondary min-w-0 flex-1">
            {recommendation.municipality && (
              <span className="font-medium text-teal">
                {recommendation.municipality}
              </span>
            )}
            {recommendation.municipality && recommendation.plan_name && (
              <span className="mx-1.5 text-gray-300" aria-hidden="true">
                /
              </span>
            )}
            {recommendation.plan_name && (
              <span className="truncate">{recommendation.plan_name}</span>
            )}
          </div>
          <Link
            href={`/plans/${recommendation.plan_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-navy transition-colors ml-2 flex-shrink-0"
          >
            View plan
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Responsible party */}
        {recommendation.responsible_party && (
          <p className="mt-2 text-xs text-ep-secondary">
            <span className="font-medium">Responsible:</span>{' '}
            {recommendation.responsible_party}
          </p>
        )}
      </div>
    </article>
  );
}
