import { getPlans, getDashboardStats, getMunicipalities } from '@/lib/db';
import Link from 'next/link';
import HomeSearch from '@/components/HomeSearch';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const stats = getDashboardStats();
  const plans = getPlans();
  const municipalities = getMunicipalities();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#012169] via-[#0a3d7a] to-[#1a5a9e] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="14" width="22" height="30" rx="2.5" fill="#1B6B52" opacity="0.85"/>
              <rect x="12" y="22" width="22" height="30" rx="2.5" fill="#2E9E78" opacity="0.85"/>
              <rect x="20" y="10" width="22" height="30" rx="2.5" fill="#43C99B" opacity="0.85"/>
              <rect x="28" y="18" width="22" height="30" rx="2.5" fill="#1B4F72" opacity="0.85"/>
              <rect x="36" y="6" width="22" height="30" rx="2.5" fill="#2E75B6" opacity="0.85"/>
            </svg>
            <div>
              <h1 className="text-3xl md:text-4xl font-medium text-white">EveryPlan</h1>
              <p className="text-xs text-white/70 tracking-widest uppercase">MAPC Municipal Planning Hub</p>
            </div>
          </div>

          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Search, explore, and compare municipal planning documents across the MAPC region.
            Find recommendations, track goals, and discover best practices.
          </p>

          {/* Search Bar */}
          <HomeSearch />

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            <Link href="/plans" className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-semibold text-white group-hover:text-white/80">{stats.total_plans}</div>
              <div className="text-sm text-white/70 group-hover:underline">Plans Indexed</div>
            </Link>
            <Link href="/map" className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-semibold text-white group-hover:text-white/80">{stats.municipalities_with_plans}</div>
              <div className="text-sm text-white/70 group-hover:underline">Municipalities</div>
            </Link>
            <Link href="/recommendations" className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-semibold text-white group-hover:text-white/80">{stats.total_recommendations}</div>
              <div className="text-sm text-white/70 group-hover:underline">Recommendations</div>
            </Link>
            <Link href="/plans/types" className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-semibold text-white group-hover:text-white/80">{Object.keys(stats.plans_by_type).length}</div>
              <div className="text-sm text-white/70 group-hover:underline">Plan Types</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/map" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-teal">
            <h3 className="font-medium text-navy text-lg mb-2">Interactive Map</h3>
            <p className="text-sm text-ep-secondary">Explore plans by municipality on an interactive map of the MAPC region.</p>
          </Link>
          <Link href="/recommendations" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-coral">
            <h3 className="font-medium text-navy text-lg mb-2">Recommendations Hub</h3>
            <p className="text-sm text-ep-secondary">Browse and filter {stats.total_recommendations} recommendations across all plans.</p>
          </Link>
          <Link href="/dashboard" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue">
            <h3 className="font-medium text-navy text-lg mb-2">Dashboard</h3>
            <p className="text-sm text-ep-secondary">View summary statistics and charts on plan coverage and content.</p>
          </Link>
        </div>
      </section>

      {/* Recent Plans Table */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-navy">Indexed Plans</h2>
          <Link href="/plans" className="text-blue hover:underline text-sm font-medium">
            View all plans →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Municipality</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider">Plan Name</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Year</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-ep-secondary uppercase tracking-wider hidden lg:table-cell">Sections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{plan.municipality}</td>
                  <td className="px-4 py-3">
                    <Link href={`/plans/${plan.id}`} className="text-blue hover:underline">
                      {plan.plan_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ep-secondary hidden md:table-cell">{plan.year_adopted || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.adoption_status === 'adopted' ? 'bg-tag-green-bg text-tag-green-text' :
                      plan.adoption_status === 'draft' ? 'bg-tag-amber-bg text-tag-amber-text' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.adoption_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ep-secondary hidden lg:table-cell">{plan.section_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Municipality Coverage */}
        <div className="mt-12">
          <h2 className="text-xl font-medium text-navy mb-6">Municipality Coverage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {municipalities.map((muni) => (
              muni.has_plan ? (
                <Link
                  key={muni.id}
                  href={`/plans?municipality=${encodeURIComponent(muni.name)}`}
                  className="p-3 rounded-lg border border-teal bg-tag-green-bg hover:shadow-md hover:border-teal/80 transition-all"
                >
                  <div className="font-medium text-sm text-navy">{muni.name}</div>
                  <div className="text-xs text-ep-secondary mt-1">
                    {muni.plan_count} plan{muni.plan_count !== 1 ? 's' : ''}
                  </div>
                </Link>
              ) : (
                <div key={muni.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="font-medium text-sm text-navy">{muni.name}</div>
                  <div className="text-xs text-ep-secondary mt-1">No plans yet</div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="14" width="22" height="30" rx="2.5" fill="#1B6B52" opacity="0.85"/>
              <rect x="12" y="22" width="22" height="30" rx="2.5" fill="#2E9E78" opacity="0.85"/>
              <rect x="20" y="10" width="22" height="30" rx="2.5" fill="#43C99B" opacity="0.85"/>
              <rect x="28" y="18" width="22" height="30" rx="2.5" fill="#1B4F72" opacity="0.85"/>
              <rect x="36" y="6" width="22" height="30" rx="2.5" fill="#2E75B6" opacity="0.85"/>
            </svg>
            <span className="font-medium">EveryPlan</span>
          </div>
          <p className="text-sm text-blue-100">
            A project of the Metropolitan Area Planning Council (MAPC)
          </p>
          <div className="flex gap-4 text-sm text-blue-100">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
