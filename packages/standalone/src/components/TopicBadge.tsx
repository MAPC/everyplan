'use client';

import { TOPIC_FAMILIES } from '@/lib/types';

interface TopicBadgeProps {
  topic: string;
  onClick?: () => void;
}

export default function TopicBadge({ topic, onClick }: TopicBadgeProps) {
  const family = TOPIC_FAMILIES[topic] || {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: topic,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${family.bg} ${family.text} ${
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {family.label}
    </span>
  );
}
