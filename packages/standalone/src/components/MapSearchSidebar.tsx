'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, ChevronDown, X, FileText } from 'lucide-react';

interface MunicipalityEntry {
  name: string;
  is_mapc: boolean;
  is_nspc: boolean;
  has_plan: boolean;
  plan_count: number;
}

interface MapSearchSidebarProps {
  municipalities: MunicipalityEntry[];
  onHover: (name: string | null) => void;
  onClick: (name: string) => void;
  selectedMunicipality?: string | null;
}

const SUBREGIONS = [
  'All MAPC',
  'NSPC',
  'ICC',
  'MAGIC',
  'MWRC',
  'MetroWest',
  'NSTF',
  'SSC',
  'SWAP',
  'TRIC',
];

export default function MapSearchSidebar({
  municipalities,
  onHover,
  onClick,
  selectedMunicipality,
}: MapSearchSidebarProps) {
  const [query, setQuery] = useState('');
  const [subregion, setSubregion] = useState('All MAPC');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter municipalities by search query and subregion
  const filtered = useMemo(() => {
    let list = municipalities;

    // Filter by subregion
    if (subregion === 'NSPC') {
      list = list.filter(m => m.is_nspc);
    } else if (subregion !== 'All MAPC') {
      // For other subregions we only have MAPC data
      list = list.filter(m => m.is_mapc);
    }

    // Filter by search query (prefix word matching like DataCommon)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(m => {
        const name = m.name.toLowerCase();
        // Match if any word starts with the query or the name contains it
        return (
          name.startsWith(q) ||
          name.split(' ').some(word => word.startsWith(q)) ||
          name.includes(q)
        );
      });
    }

    // Sort: municipalities with plans first, then alphabetical
    return list.sort((a, b) => {
      if (a.has_plan && !b.has_plan) return -1;
      if (!a.has_plan && b.has_plan) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [municipalities, query, subregion]);

  const handleClear = useCallback(() => {
    setQuery('');
    onHover(null);
    inputRef.current?.focus();
  }, [onHover]);

  return (
    <div className="absolute top-[5%] left-[3%] z-10 w-[320px] max-h-[85vh] flex flex-col pointer-events-auto">
      {/* Search card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-navy tracking-wide uppercase">
            Explore Municipalities
          </h2>
          <p className="text-xs text-ep-secondary mt-0.5">
            {municipalities.filter(m => m.has_plan).length} municipalities with plans indexed
          </p>
        </div>

        {/* Search input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search municipalities..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setShowDropdown(false);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Subregion filter */}
        <div className="px-3 pb-3" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">
                {subregion === 'All MAPC' ? 'All MAPC Subregions' : subregion + ' Subregion'}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                {SUBREGIONS.map(sr => (
                  <button
                    key={sr}
                    onClick={() => {
                      setSubregion(sr);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                      sr === subregion ? 'text-teal font-medium bg-teal/5' : 'text-gray-700'
                    }`}
                  >
                    {sr === 'All MAPC' ? 'All MAPC Subregions' : sr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-1.5 bg-gray-50/80 border-t border-b border-gray-100 text-xs text-ep-secondary">
          {filtered.length} municipalit{filtered.length === 1 ? 'y' : 'ies'}
          {query && ` matching "${query}"`}
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No municipalities found</p>
              <button
                onClick={handleClear}
                className="text-xs text-teal hover:underline mt-1"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map(m => (
                <li key={m.name}>
                  <button
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-teal/5 transition-colors group ${
                      selectedMunicipality === m.name ? 'bg-teal/10' : ''
                    }`}
                    onMouseEnter={() => onHover(m.name)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onClick(m.name)}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        m.has_plan
                          ? 'bg-teal'
                          : m.is_mapc
                          ? 'bg-gray-300'
                          : 'bg-gray-200'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm truncate ${
                            m.has_plan
                              ? 'text-navy font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {m.name}
                        </span>
                        {m.is_nspc && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-teal/10 text-teal rounded font-medium flex-shrink-0">
                            NSPC
                          </span>
                        )}
                      </div>
                      {m.has_plan && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <FileText className="h-3 w-3 text-teal/60" />
                          <span className="text-xs text-ep-secondary">
                            {m.plan_count} plan{m.plan_count !== 1 ? 's' : ''} indexed
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-gray-300 group-hover:text-teal transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend footer */}
        <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-ep-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal" />
              <span>Has plans</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span>MAPC member</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
              <span>Non-MAPC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
