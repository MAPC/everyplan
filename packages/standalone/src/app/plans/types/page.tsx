import { getDashboardStats } from '@/lib/db';
import Link from 'next/link';
import { Trees, Home, Wifi, FileText, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PLAN_TYPE_CARDS = [
  {
    slug: 'osrp',
    type: 'open_space_recreation',
    title: 'Open Space & Recreation Plans',
    shortTitle: 'OSRP',
    description: 'Comprehensive plans that inventory natural and recreational resources, assess community needs, and establish goals for conservation and recreation.',
    stateAgency: 'Division of Conservation Services (DCS)',
    grantEligibility: 'LAND and PARC grants',
    updateCycle: '7 years',
    icon: Trees,
    headerBg: '#16a34a',
    pillClass: 'bg-tag-green-bg text-tag-green-text',
    available: true,
  },
  {
    slug: 'hpp',
    type: 'housing_production',
    title: 'Housing Production Plans',
    shortTitle: 'HPP',
    description: 'Strategic plans to increase affordable housing stock, achieve compliance with Chapter 40B, and earn safe harbor certification from DHCD.',
    stateAgency: 'Dept. of Housing & Community Development (DHCD)',
    grantEligibility: '40B safe harbor certification',
    updateCycle: '5 years',
    icon: Home,
    headerBg: '#2563eb',
    pillClass: 'bg-tag-blue-bg text-tag-blue-text',
    available: true,
  },
  {
    slug: 'dep',
    type: 'digital_equity',
    title: 'Digital Equity Plans',
    shortTitle: 'DEP',
    description: 'Plans addressing digital inclusion, broadband access, and technology adoption barriers across communities.',
    stateAgency: 'Mass Broadband Institute (MBI)',
    grantEligibility: 'BEAD / Digital Equity Act funding',
    updateCycle: 'Varies',
    icon: Wifi,
    headerBg: '#9333ea',
    pillClass: 'bg-tag-purple-bg text-tag-purple-text',
    available: false,
  },
];

export default function PlanTypesPage() {
  const stats = getDashboardStats();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-navy">Plan Types</h1>
        <p className="text-ep-secondary mt-1">
          Massachusetts municipalities are required to produce various plans to maintain grant eligibility and guide local policy.
          EveryPlan indexes and analyzes these plans to make their contents searchable and comparable.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/plans" className="bg-white rounded-lg border p-4 text-center hover:shadow-md hover:border-blue/30 transition-all">
          <div className="text-2xl font-bold text-navy">{stats.total_plans}</div>
          <div className="text-xs text-ep-secondary mt-1">Plans Indexed</div>
        </Link>
        <Link href="/map" className="bg-white rounded-lg border p-4 text-center hover:shadow-md hover:border-blue/30 transition-all">
          <div className="text-2xl font-bold text-navy">{stats.municipalities_with_plans}</div>
          <div className="text-xs text-ep-secondary mt-1">Municipalities</div>
        </Link>
        <Link href="/recommendations" className="bg-white rounded-lg border p-4 text-center hover:shadow-md hover:border-blue/30 transition-all">
          <div className="text-2xl font-bold text-navy">{stats.total_recommendations}</div>
          <div className="text-xs text-ep-secondary mt-1">Recommendations</div>
        </Link>
        <div className="bg-white rounded-lg border p-4 text-center border-blue/20 bg-blue/5">
          <div className="text-2xl font-bold text-navy">{Object.keys(stats.plans_by_type).length}</div>
          <div className="text-xs text-ep-secondary mt-1">Plan Types</div>
        </div>
      </div>

      {/* Plan type cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLAN_TYPE_CARDS.map((card) => {
          const Icon = card.icon;
          const planCount = stats.plans_by_type[card.type] || 0;

          return (
            <div key={card.slug} className="bg-white rounded-lg border overflow-hidden flex flex-col">
              {/* Card header */}
              <div className="px-5 py-4 text-white" style={{ backgroundColor: card.headerBg }}>
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg font-semibold">{card.shortTitle}</h2>
                    <p className="text-sm text-white/80">{card.title}</p>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-sm text-ep-text leading-relaxed mb-4">{card.description}</p>

                <div className="space-y-2 text-xs text-ep-secondary mb-4">
                  <div className="flex justify-between">
                    <span>State Agency</span>
                    <span className="font-medium text-navy text-right ml-2">{card.stateAgency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grant Eligibility</span>
                    <span className="font-medium text-navy">{card.grantEligibility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Update Cycle</span>
                    <span className="font-medium text-navy">{card.updateCycle}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t flex items-center justify-between">
                  {card.available && planCount > 0 ? (
                    <Link
                      href={`/plans?plan_type=${card.type}`}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${card.pillClass}`}
                    >
                      {planCount} plans indexed
                    </Link>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${card.pillClass}`}>
                      {planCount > 0 ? `${planCount} plans indexed` : 'Coming soon'}
                    </span>
                  )}
                  {card.available ? (
                    <Link
                      href={`/plans/types/${card.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline"
                    >
                      Explore
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="text-xs text-ep-secondary italic">Hub page coming soon</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Future plan types note */}
      <div className="mt-8 bg-ep-bg rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <FileText className="w-8 h-8 text-ep-secondary mx-auto mb-3" />
        <h3 className="text-sm font-medium text-navy mb-1">More Plan Types Coming Soon</h3>
        <p className="text-xs text-ep-secondary max-w-md mx-auto">
          We&apos;re working on adding support for Comprehensive Plans, Hazard Mitigation Plans,
          Climate Action Plans, and more. Have a plan type you&apos;d like to see?{' '}
          <Link href="/about" className="text-blue hover:underline">Let us know</Link>.
        </p>
      </div>
    </div>
  );
}
