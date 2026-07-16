'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function HomeSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search across all plans... (e.g., "trails", "climate resilience", "funding")'
          className="w-full pl-12 pr-24 py-4 rounded-xl text-ep-text bg-white shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-mint text-base"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal text-white px-5 py-2 rounded-lg font-medium hover:bg-forest transition-colors text-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
}
