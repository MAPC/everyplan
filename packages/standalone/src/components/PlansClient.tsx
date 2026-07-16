'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Download, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Plan, Municipality } from '@/lib/types';
import { TOPIC_FAMILIES, PLAN_TYPES, PLAN_TYPE_COLORS } from '@/lib/types';

interface PlansClientProps {
  plans: Plan[];
  municipalities: Municipality[];
  initialFilters?: Record<string, string>;
}

const POPULATION_BUCKETS = [
  { label: 'Under 10k', min: 0, max: 10000 },
  { label: '10k – 25k', min: 10000, max: 25000 },
  { label: '25k – 50k', min: 25000, max: 50000 },
  { label: '50k – 100k', min: 50000, max: 100000 },
  { label: '100k+', min: 100000, max: Infinity },
];

export default function PlansClient({ plans, municipalities, initialFilters = {} }: PlansClientProps) {
  // Basic filters
  const [muniFilter, setMuniFilter] = useState(initialFilters.municipality || '');
  const [planTypeFilter, setPlanTypeFilter] = useState(initialFilters.plan_type || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || '');
  const [yearFilter, setYearFilter] = useState(initialFilters.year || '');
  const [consultantFilter, setConsultantFilter] = useState(initialFilters.consultant || '');
  const [topicFilter, setTopicFilter] = useState(initialFilters.topic || '');
  const [cityTownFilter, setCityTownFilter] = useState('');
  const [populationFilter, setPopulationFilter] = useState('');

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countyFilter, setCountyFilter] = useState('');
  const [rpaFilter, setRpaFilter] = useState('');
  const [popDensityMin, setPopDensityMin] = useState('');
  const [popDensityMax, setPopDensityMax] = useState('');
  const [incomeMin, setIncomeMin] = useState('');
  const [incomeMax, setIncomeMax] = useState('');
  const [homeValueMin, setHomeValueMin] = useState('');
  const [homeValueMax, setHomeValueMax] = useState('');

  // Sort & UI
  const [sortField, setSortField] = useState<'municipality' | 'year_adopted' | 'plan_name'>('municipality');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(Object.keys(initialFilters).length > 0);

  // Build municipality lookup for MMA data
  const muniLookup = useMemo(() => {
    const map = new Map<string, Municipality>();
    for (const m of municipalities) map.set(m.name, m);
    return map;
  }, [municipalities]);

  // Get unique values for filter dropdowns
  const muniNames = useMemo(() =>
    municipalities.filter(m => m.has_plan).map(m => m.name).sort(),
    [municipalities]
  );
  const planTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of plans) if (p.plan_type) set.add(p.plan_type);
    return Array.from(set).sort();
  }, [plans]);
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const p of plans) if (p.year_adopted) set.add(p.year_adopted);
    return Array.from(set).sort((a, b) => b - a);
  }, [plans]);
  const consultants = useMemo(() => {
    const set = new Set<string>();
    for (const p of plans) if (p.consultant) set.add(p.consultant);
    return Array.from(set).sort();
  }, [plans]);
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const p of plans) for (const t of p.topics) set.add(t);
    return Array.from(set).sort();
  }, [plans]);
  const counties = useMemo(() => {
    const set = new Set<string>();
    for (const m of municipalities) if (m.county) set.add(m.county);
    return Array.from(set).sort();
  }, [municipalities]);
  const rpas = useMemo(() => {
    const set = new Set<string>();
    for (const m of municipalities) if (m.regional_planning_agency) set.add(m.regional_planning_agency);
    return Array.from(set).sort();
  }, [municipalities]);

  const activeFilterCount = [
    muniFilter, planTypeFilter, statusFilter, yearFilter, consultantFilter, topicFilter,
    cityTownFilter, populationFilter,
    countyFilter, rpaFilter, popDensityMin, popDensityMax,
    incomeMin, incomeMax, homeValueMin, homeValueMax,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let result = [...plans];

    // Basic filters
    if (muniFilter) result = result.filter(p => p.municipality === muniFilter);
    if (planTypeFilter) result = result.filter(p => p.plan_type === planTypeFilter);
    if (statusFilter) result = result.filter(p => p.adoption_status === statusFilter);
    if (yearFilter) result = result.filter(p => p.year_adopted === parseInt(yearFilter));
    if (consultantFilter) result = result.filter(p => p.consultant === consultantFilter);
    if (topicFilter) result = result.filter(p => p.topics.includes(topicFilter));

    // MMA-based filters (match on municipality)
    if (cityTownFilter) {
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        if (!m?.city_or_town) return false;
        return m.city_or_town.toLowerCase().startsWith(cityTownFilter.toLowerCase());
      });
    }
    if (populationFilter) {
      const bucket = POPULATION_BUCKETS[parseInt(populationFilter)];
      if (bucket) {
        result = result.filter(p => {
          const m = muniLookup.get(p.municipality);
          return m?.population != null && m.population >= bucket.min && m.population < bucket.max;
        });
      }
    }
    if (countyFilter) {
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        return m?.county === countyFilter;
      });
    }
    if (rpaFilter) {
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        return m?.regional_planning_agency === rpaFilter;
      });
    }
    if (popDensityMin || popDensityMax) {
      const min = popDensityMin ? parseFloat(popDensityMin) : 0;
      const max = popDensityMax ? parseFloat(popDensityMax) : Infinity;
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        return m?.population_density != null && m.population_density >= min && m.population_density <= max;
      });
    }
    if (incomeMin || incomeMax) {
      const min = incomeMin ? parseInt(incomeMin) : 0;
      const max = incomeMax ? parseInt(incomeMax) : Infinity;
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        return m?.income_per_capita != null && m.income_per_capita >= min && m.income_per_capita <= max;
      });
    }
    if (homeValueMin || homeValueMax) {
      const min = homeValueMin ? parseInt(homeValueMin) : 0;
      const max = homeValueMax ? parseInt(homeValueMax) : Infinity;
      result = result.filter(p => {
        const m = muniLookup.get(p.municipality);
        return m?.median_home_value != null && m.median_home_value >= min && m.median_home_value <= max;
      });
    }

    result.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [plans, muniFilter, planTypeFilter, statusFilter, yearFilter, consultantFilter, topicFilter, cityTownFilter, populationFilter, countyFilter, rpaFilter, popDensityMin, popDensityMax, incomeMin, incomeMax, homeValueMin, homeValueMax, sortField, sortDir, muniLookup]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const clearAllFilters = () => {
    setMuniFilter(''); setPlanTypeFilter(''); setStatusFilter(''); setYearFilter('');
    setConsultantFilter(''); setTopicFilter(''); setCityTownFilter(''); setPopulationFilter('');
    setCountyFilter(''); setRpaFilter(''); setPopDensityMin(''); setPopDensityMax('');
    setIncomeMin(''); setIncomeMax(''); setHomeValueMin(''); setHomeValueMax('');
  };

  const exportCSV = () => {
    const headers = ['Municipality', 'Plan Name', 'Type', 'Year', 'Status', 'Consultant', 'Population', 'County', 'Sections', 'Recommendations'];
    const rows = filtered.map(p => {
      const m = muniLookup.get(p.municipality);
      return [
        p.municipality, p.plan_name, PLAN_TYPES[p.plan_type] || p.plan_type,
        p.year_adopted || '', p.adoption_status, p.consultant || '',
        m?.population || '', m?.county || '',
        p.section_count || 0, p.recommendation_count || 0,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'everyplan_plans.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-teal text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <span className="text-sm text-ep-secondary ml-auto">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border rounded-lg mb-4 overflow-hidden">
          {/* Basic Filters */}
          <div className="p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-ep-secondary mb-1">Municipality</label>
              <select value={muniFilter} onChange={e => setMuniFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                {muniNames.map(m => <option key={m} value={m}>{m}</option>)}
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
              <label className="block text-xs font-medium text-ep-secondary mb-1">Year</label>
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ep-secondary mb-1">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                <option value="adopted">Adopted</option>
                <option value="draft">Draft</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ep-secondary mb-1">Consultant</label>
              <select value={consultantFilter} onChange={e => setConsultantFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                {consultants.map(c => <option key={c} value={c}>{c}</option>)}
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
              <button onClick={clearAllFilters} className="flex items-center gap-1 text-sm text-coral hover:underline pb-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          {/* Municipal characteristic filters */}
          <div className="px-4 pb-3 flex flex-wrap gap-4 items-end border-t pt-3">
            <div>
              <label className="block text-xs font-medium text-ep-secondary mb-1">City / Town</label>
              <select value={cityTownFilter} onChange={e => setCityTownFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                <option value="City">City</option>
                <option value="Town">Town</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ep-secondary mb-1">Population</label>
              <select value={populationFilter} onChange={e => setPopulationFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">All</option>
                {POPULATION_BUCKETS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
              </select>
            </div>
          </div>

          {/* Advanced Filters Accordion */}
          <div className="border-t">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-ep-secondary uppercase tracking-wider hover:bg-gray-50 transition-colors"
            >
              <span>Advanced Filters (Municipal Characteristics)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 flex flex-wrap gap-4 items-end border-t bg-gray-50/50">
                <div className="pt-3">
                  <label className="block text-xs font-medium text-ep-secondary mb-1">County</label>
                  <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                    <option value="">All</option>
                    {counties.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pt-3">
                  <label className="block text-xs font-medium text-ep-secondary mb-1">Regional Planning Agency</label>
                  <select value={rpaFilter} onChange={e => setRpaFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                    <option value="">All</option>
                    {rpas.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="pt-3">
                  <label className="block text-xs font-medium text-ep-secondary mb-1">Pop. Density (per sq mi)</label>
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={popDensityMin} onChange={e => setPopDensityMin(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-20" />
                    <span className="text-xs text-ep-secondary">–</span>
                    <input type="number" placeholder="Max" value={popDensityMax} onChange={e => setPopDensityMax(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-20" />
                  </div>
                </div>
                <div className="pt-3">
                  <label className="block text-xs font-medium text-ep-secondary mb-1">Income Per Capita ($)</label>
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={incomeMin} onChange={e => setIncomeMin(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-24" />
                    <span className="text-xs text-ep-secondary">–</span>
                    <input type="number" placeholder="Max" value={incomeMax} onChange={e => setIncomeMax(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-24" />
                  </div>
                </div>
                <div className="pt-3">
                  <label className="block text-xs font-medium text-ep-secondary mb-1">Median Home Value ($)</label>
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={homeValueMin} onChange={e => setHomeValueMin(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-28" />
                    <span className="text-xs text-ep-secondary">–</span>
                    <input type="number" placeholder="Max" value={homeValueMax} onChange={e => setHomeValueMax(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-white w-28" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider cursor-pointer hover:text-navy" onClick={() => handleSort('municipality')}>
                  Municipality {sortField === 'municipality' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider cursor-pointer hover:text-navy" onClick={() => handleSort('plan_name')}>
                  Plan Name {sortField === 'plan_name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider cursor-pointer hover:text-navy hidden sm:table-cell" onClick={() => handleSort('year_adopted')}>
                  Year {sortField === 'year_adopted' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden xl:table-cell">Consultant</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden lg:table-cell">Topics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">
                    <button
                      onClick={() => { setMuniFilter(plan.municipality); setShowFilters(true); }}
                      className="hover:text-blue hover:underline cursor-pointer"
                    >
                      {plan.municipality}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/plans/${plan.id}`} className="text-blue hover:underline">{plan.plan_name}</Link>
                    <div className="text-xs text-ep-secondary mt-0.5">
                      {plan.section_count} sections · {plan.recommendation_count} recommendations
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link
                      href={`/plans/types/${PLAN_TYPE_COLORS[plan.plan_type]?.slug || plan.plan_type}`}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${PLAN_TYPE_COLORS[plan.plan_type]?.pill || 'bg-gray-100 text-gray-700'}`}
                    >
                      {PLAN_TYPES[plan.plan_type] || plan.plan_type}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-ep-secondary hidden sm:table-cell">{plan.year_adopted || '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <button
                      onClick={() => { setStatusFilter(plan.adoption_status); setShowFilters(true); }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                        plan.adoption_status === 'adopted' ? 'bg-tag-green-bg text-tag-green-text' :
                        plan.adoption_status === 'draft' ? 'bg-tag-amber-bg text-tag-amber-text' :
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {plan.adoption_status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm hidden xl:table-cell">
                    {plan.consultant ? (
                      <button
                        onClick={() => { setConsultantFilter(plan.consultant!); setShowFilters(true); }}
                        className="text-ep-secondary hover:text-blue hover:underline cursor-pointer"
                      >
                        {plan.consultant}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {plan.topics.slice(0, 3).map(t => {
                        const f = TOPIC_FAMILIES[t];
                        return f ? (
                          <button
                            key={t}
                            onClick={() => { setTopicFilter(t); setShowFilters(true); }}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}
                          >
                            {f.label}
                          </button>
                        ) : null;
                      })}
                      {plan.topics.length > 3 && <span className="text-xs text-ep-secondary">+{plan.topics.length - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
