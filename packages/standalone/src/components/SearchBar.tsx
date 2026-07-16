'use client';

import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  resultCount?: number;
  defaultValue?: string;
  compact?: boolean;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search plans, recommendations, and municipalities...',
  resultCount,
  defaultValue = '',
  compact = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) {
          onSearch(query.trim());
        }
      }
    },
    [query, onSearch]
  );

  if (compact) {
    return (
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ep-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-ep-bg text-ep-text placeholder-ep-secondary focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-colors"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-ep-secondary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-24 py-3 text-base border border-gray-200 rounded-xl bg-white text-ep-text placeholder-ep-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
            aria-label="Search"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-1.5 bg-blue text-white text-sm font-medium rounded-lg hover:bg-navy transition-colors focus:outline-none focus:ring-2 focus:ring-blue/50"
          >
            Search
          </button>
        </div>
      </form>
      {resultCount !== undefined && (
        <p className="mt-2 text-sm text-ep-secondary text-center">
          {resultCount === 0
            ? 'No results found'
            : `${resultCount} result${resultCount === 1 ? '' : 's'} found`}
        </p>
      )}
    </div>
  );
}
