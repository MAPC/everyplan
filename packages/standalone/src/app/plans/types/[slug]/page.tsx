import { getPlans, getRecommendations, getPlanTypeHubStats } from '@/lib/db';
import { PLAN_TYPES, TOPIC_FAMILIES, PLAN_TYPE_COLORS } from '@/lib/types';
import Link from 'next/link';
import { ExternalLink, FileText, BookOpen, Trees, Home, BarChart3, MapPin, CheckCircle2, ChevronDown } from 'lucide-react';
import PlanTypeHubClient from '@/components/PlanTypeHubClient';

export const dynamic = 'force-dynamic';

// Plan type slug to internal plan_type mapping
const SLUG_TO_TYPE: Record<string, string> = {
  osrp: 'open_space_recreation',
  hpp: 'housing_production',
  dep: 'digital_equity',
};

// Plan type metadata for hub pages
const PLAN_TYPE_META: Record<string, {
  title: string;
  shortTitle: string;
  description: string;
  whyItMatters: string;
  fundingNote: string;
  stateAgency: string;
  stateAgencyContact?: string;
  overviewUrl: string;
  workbookUrl?: string;
  workbookTitle?: string;
  icon: string;
  requiredSections: Array<{ number: string; label: string; subsections?: string[] }>;
  requiredMaps?: Array<{ label: string }>;
}> = {
  housing_production: {
    title: 'Housing Production Plans (HPPs)',
    shortTitle: 'HPP',
    description: 'Housing Production Plans are strategic municipal plans required by DHCD to increase affordable housing stock. They analyze local housing needs, set production targets to meet Chapter 40B thresholds, identify development sites, and outline implementation strategies for a 5-year period.',
    whyItMatters: 'An approved HPP allows municipalities to earn "safe harbor" certification from DHCD under Chapter 40B. When a municipality produces at least 0.5% of its year-round housing units as affordable in a single calendar year, it can receive certification that provides protection from unwanted comprehensive permit applications for one year (1.0% production earns two years of protection).',
    fundingNote: 'Chapter 40B safe harbor certification — requires an approved, current HPP with demonstrated annual production',
    stateAgency: 'Department of Housing and Community Development (DHCD)',
    overviewUrl: 'https://www.mass.gov/info-details/chapter-40-b-housing-production',
    workbookUrl: 'https://www.mass.gov/doc/housing-production-plan-regulation-760-cmr-5603/download',
    workbookTitle: 'Housing Production Plan Guidelines (DHCD, 760 CMR 56.03(4), October 2020)',
    icon: '🏠',
    requiredSections: [
      { number: '1', label: 'Executive Summary' },
      { number: '2', label: 'Comprehensive Housing Needs Assessment', subsections: ['Demographic and Housing Data', 'Housing Market Analysis', 'Building Permit and Development Trends', 'Subsidized Housing Inventory (SHI)'] },
      { number: '3', label: 'Development Constraints and Limitations', subsections: ['Environmental Constraints', 'Infrastructure Capacity', 'Regulatory Barriers'] },
      { number: '4', label: 'Affordable Housing Goals', subsections: ['Annual Production Targets', 'Unit Type Mix'] },
      { number: '5', label: 'Identification of Development Locations', subsections: ['Zoning Districts for Housing', 'Specific Sites for Affordable Housing', 'Zoning Changes Needed'] },
      { number: '6', label: 'Implementation Strategies', subsections: ['Zoning Reform Strategies', 'Housing Production Programs', 'Funding Strategies', 'Partnerships'] },
    ],
  },
  open_space_recreation: {
    title: 'Open Space & Recreation Plans (OSRPs)',
    shortTitle: 'OSRP',
    description: 'Open Space and Recreation Plans are comprehensive municipal plans that inventory natural and recreational resources, assess community needs, and establish goals and actions for conservation and recreation over a 7-year period.',
    whyItMatters: 'An approved OSRP is a prerequisite for municipalities to apply for state land acquisition grants through the Division of Conservation Services (DCS), including the Local Acquisitions for Natural Diversity (LAND) grant program and the Parkland Acquisitions and Renovations for Communities (PARC) program. Plans must be updated every 7 years to maintain grant eligibility.',
    fundingNote: 'DCS LAND and PARC grants — requires an approved, current OSRP',
    stateAgency: 'Division of Conservation Services (DCS), Executive Office of Energy and Environmental Affairs',
    overviewUrl: 'https://www.mass.gov/info-details/open-space-and-recreation-plans',
    workbookUrl: 'https://www.mass.gov/doc/open-space-and-recreation-planners-workbook-with-appendices-updated-in-2025/download',
    workbookTitle: 'Open Space and Recreation Planner\'s Workbook (DCS, 2025)',
    icon: '🌳',
    requiredSections: [
      { number: '1', label: 'Executive Summary' },
      { number: '2', label: 'Introduction', subsections: ['Statement of Purpose', 'Planning Process and Public Participation', 'Enhanced Outreach (EJ)'] },
      { number: '3', label: 'Community Setting', subsections: ['Regional Context', 'Population Characteristics', 'Growth and Development Patterns'] },
      { number: '4', label: 'Environmental Inventory and Analysis', subsections: ['Soils & Topography', 'Water Resources', 'Vegetation', 'Fisheries & Wildlife', 'Scenic Resources', 'Climate Change Impacts'] },
      { number: '5', label: 'Conservation and Recreation Lands Inventory', subsections: ['Municipal Properties', 'Public Properties', 'Private Parcels', 'Park and Open Space Equity'] },
      { number: '6', label: 'Analysis of Needs', subsections: ['Natural Resource Protection', 'Outdoor Recreation', 'Management Needs'] },
      { number: '7', label: 'Action Plan (Goals and Objectives)' },
      { number: '8', label: 'Public Comments and Letters of Support' },
      { number: '9', label: 'References' },
    ],
    requiredMaps: [
      { label: 'Regional Context' },
      { label: 'Environmental Justice' },
      { label: 'Zoning' },
      { label: 'Soils' },
      { label: 'Water Resources' },
      { label: 'Unique Features' },
      { label: 'Climate Change' },
      { label: 'Inventory of Open Space' },
    ],
  },
};

interface PageProps {
  params: { slug: string };
}

export default function PlanTypeHubPage({ params }: PageProps) {
  const planType = SLUG_TO_TYPE[params.slug];
  if (!planType) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-medium text-navy mb-4">Plan Type Not Found</h1>
        <p className="text-ep-secondary mb-6">The plan type &quot;{params.slug}&quot; is not yet available.</p>
        <Link href="/plans" className="text-blue hover:underline">Back to all plans</Link>
      </div>
    );
  }

  const meta = PLAN_TYPE_META[planType];
  if (!meta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-medium text-navy mb-4">{PLAN_TYPES[planType] || planType}</h1>
        <p className="text-ep-secondary mb-6">Hub page content for this plan type is coming soon.</p>
        <Link href="/plans" className="text-blue hover:underline">Back to all plans</Link>
      </div>
    );
  }

  const stats = getPlanTypeHubStats(planType);
  const plans = getPlans({ plan_type: planType });
  const recommendations = getRecommendations({ plan_type: planType });

  // Plan-type-specific banner colors
  const bannerColors: Record<string, string> = {
    open_space_recreation: 'from-[#166534] to-[#15803d]',
    housing_production: 'from-[#1e3a5f] to-[#2563eb]',
  };
  const bannerGradient = bannerColors[planType] || 'from-[#1a365d] to-[#2a5298]';

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className={`bg-gradient-to-br ${bannerGradient} text-white`}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-200 mb-4">
            <Link href="/plans" className="hover:text-white">Plans</Link>
            <span className="mx-2">→</span>
            <span className="text-white">{meta.shortTitle}</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold mb-3">{meta.title}</h1>
              <p className="text-blue-100 leading-relaxed">{meta.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/plans?plan_type=${planType}`} className="text-center px-5 py-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                <div className="text-2xl font-bold">{stats.plan_count}</div>
                <div className="text-xs text-blue-200">Plans Indexed</div>
              </Link>
              <Link href={`/plans?plan_type=${planType}`} className="text-center px-5 py-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                <div className="text-2xl font-bold">{stats.municipality_count}</div>
                <div className="text-xs text-blue-200">Municipalities</div>
              </Link>
              <a href="#recommendations-section" className="text-center px-5 py-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                <div className="text-2xl font-bold">{stats.recommendation_count}</div>
                <div className="text-xs text-blue-200">Recommendations</div>
              </a>
              <a href="#recommendations-section" className="text-center px-5 py-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors">
                <div className="text-2xl font-bold">{stats.data_source_count}</div>
                <div className="text-xs text-blue-200">Data Sources</div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Why This Plan Matters */}
        <section>
          <h2 className="text-xl font-medium text-navy mb-4 flex items-center gap-2">
            {planType === 'housing_production' ? <Home className="w-5 h-5 text-blue-600" /> : <Trees className="w-5 h-5 text-green-600" />}
            Why This Plan Matters
          </h2>
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <p className="text-sm text-ep-text leading-relaxed">{meta.whyItMatters}</p>
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                <strong>Grant Eligibility:</strong> {meta.fundingNote}
              </p>
            </div>
            <div className="text-sm text-ep-secondary">
              <p><strong>State Agency:</strong> {meta.stateAgency}</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={meta.overviewUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue text-white text-sm hover:bg-opacity-90 transition-colors">
                <BookOpen className="w-4 h-4" />
                State Overview Page
                <ExternalLink className="w-3 h-3" />
              </a>
              {meta.workbookUrl && (
                <a href={meta.workbookUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-blue text-blue text-sm hover:bg-blue hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                  Download Planner&apos;s Workbook
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Required Plan Structure */}
        <section>
          <h2 className="text-xl font-medium text-navy mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue" />
            Required Plan Structure
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Required Sections */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-sm font-medium text-navy uppercase tracking-wider mb-4">
                {meta.requiredSections.length} Required Sections
              </h3>
              <ol className="space-y-3">
                {meta.requiredSections.map((sec) => (
                  <li key={sec.number} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center font-medium">
                        {sec.number}
                      </span>
                      <div>
                        <span className="font-medium text-navy">{sec.label}</span>
                        {sec.subsections && (
                          <ul className="mt-1 ml-1 space-y-0.5">
                            {sec.subsections.map((sub) => (
                              <li key={sub} className="text-xs text-ep-secondary flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-ep-secondary/40 flex-shrink-0" />
                                {sub}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {meta.workbookTitle && (
                <p className="text-xs text-ep-secondary mt-4 pt-3 border-t">
                  Source: <em>{meta.workbookTitle}</em>
                </p>
              )}
            </div>

            {/* Required Maps */}
            {meta.requiredMaps && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-sm font-medium text-navy uppercase tracking-wider mb-4">
                  {meta.requiredMaps.length} Required Maps
                </h3>
                <ol className="space-y-2">
                  {meta.requiredMaps.map((map, i) => (
                    <li key={map.label} className="text-sm flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-coral flex-shrink-0" />
                      <span className="text-ep-secondary">Map {i + 1}:</span>
                      <span className="text-navy">{map.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>

        {/* Indexed Plans Table */}
        <section>
          <h2 className="text-xl font-medium text-navy mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-coral" />
            Indexed {meta.shortTitle} Plans
          </h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Municipality</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Plan Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden sm:table-cell">Year</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Consultant</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden lg:table-cell">Sections</th>
                  <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden lg:table-cell">Recs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-navy">{plan.municipality}</td>
                    <td className="px-4 py-3">
                      <Link href={`/plans/${plan.id}`} className="text-sm text-blue hover:underline">
                        {plan.plan_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-ep-secondary hidden sm:table-cell">{plan.year_adopted || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.adoption_status === 'adopted' ? 'bg-tag-green-bg text-tag-green-text' :
                        plan.adoption_status === 'draft' ? 'bg-tag-amber-bg text-tag-amber-text' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {plan.adoption_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ep-secondary hidden md:table-cell">{plan.consultant || '—'}</td>
                    <td className="px-4 py-3 text-sm text-ep-secondary hidden lg:table-cell">{plan.section_count}</td>
                    <td className="px-4 py-3 text-sm text-ep-secondary hidden lg:table-cell">{plan.recommendation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recommendations & Data Sources (interactive client component) */}
        <div id="recommendations-section" />
        <PlanTypeHubClient
          recommendations={recommendations}
          recsByCategory={stats.recommendations_by_category}
          topDataSources={stats.top_data_sources}
          planTypeLabel={meta.shortTitle}
        />
      </div>
    </div>
  );
}
