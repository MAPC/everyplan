'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  value: number | string;
  label: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export default function StatCard({
  value,
  label,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString()
      : value;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-5 shadow-sm ${
        className || ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold text-navy tracking-tight">
            {formattedValue}
          </p>
          <p className="mt-1 text-sm text-ep-secondary leading-snug">
            {label}
          </p>
          {trend && (
            <p
              className={`mt-1.5 text-xs font-medium ${
                trend.value >= 0 ? 'text-teal' : 'text-coral'
              }`}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%{trend.label ? ` ${trend.label}` : ''}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 ml-3 p-2 bg-ep-bg rounded-lg">
            <Icon className="h-5 w-5 text-teal" />
          </div>
        )}
      </div>
    </div>
  );
}
