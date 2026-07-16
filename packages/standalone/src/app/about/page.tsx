import Link from 'next/link';
import { getDashboardStats } from '@/lib/db';
import { FileText, Map, Search, Lightbulb, BarChart3, Database, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const stats = getDashboardStats();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="14" width="22" height="30" rx="2.5" fill="#1B6B52" opacity="0.85"/>
            <rect x="12" y="22" width="22" height="30" rx="2.5" fill="#2E9E78" opacity="0.85"/>
            <rect x="20" y="10" width="22" height="30" rx="2.5" fill="#43C99B" opacity="0.85"/>
            <rect x="28" y="18" width="22" height="30" rx="2.5" fill="#1B4F72" opacity="0.85"/>
            <rect x="36" y="6" width="22" height="30" rx="2.5" fill="#2E75B6" opacity="0.85"/>
          </svg>
          <div>
            <h1 className="text-3xl font-medium text-navy">EveryPlan</h1>
            <p className="text-xs text-blue tracking-widest uppercase">MAPC Municipal Planning Hub</p>
          </div>
        </div>
        <p className="text-lg text-ep-secondary max-w-2xl mx-auto">
          A centralized platform for searching, exploring, and comparing municipal planning
          documents across the MAPC region.
        </p>
      </div>

      {/* What is EveryPlan */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-navy mb-4">What is EveryPlan?</h2>
        <div className="prose prose-sm max-w-none text-ep-text leading-relaxed space-y-4">
          <p>
            Municipal plans—Open Space & Recreation Plans, comprehensive plans, housing production
            plans, climate action plans—contain critical policy data that shapes how communities
            grow, protect natural resources, and serve their residents. But these documents often
            live as isolated PDFs on municipal websites, making cross-community analysis and
            knowledge sharing difficult.
          </p>
          <p>
            EveryPlan changes this by extracting, structuring, and indexing the full text of
            municipal plans, creating a searchable, browseable, and analytically-rich platform.
            Planners, researchers, advocates, and residents can now search across plans, discover
            recommendations, compare approaches, and identify regional patterns.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-navy mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Search, title: 'Full-Text Search', description: 'Search across all plan content with highlighted snippets and context.' },
            { icon: Map, title: 'Interactive Map', description: 'Explore plans by municipality on an interactive map of the MAPC region.' },
            { icon: Lightbulb, title: 'Recommendations Hub', description: 'Browse, filter, and export recommendations extracted from all plans.' },
            { icon: BarChart3, title: 'Dashboard', description: 'Summary statistics, charts, and visualizations across the plan corpus.' },
            { icon: FileText, title: 'Plan Viewer', description: 'Read full plan text with table of contents, section navigation, and topic tags.' },
            { icon: Database, title: 'Data Export', description: 'Export plan data, recommendations, and search results in CSV or JSON format.' },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-white rounded-lg border p-5 flex gap-4">
              <Icon className="w-8 h-8 text-teal flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-navy">{title}</h3>
                <p className="text-sm text-ep-secondary mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Current Coverage */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-navy mb-4">Current Coverage</h2>
        <div className="bg-white rounded-lg border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-semibold text-teal">{stats.total_plans}</div>
              <div className="text-sm text-ep-secondary">Plans Indexed</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-blue">{stats.municipalities_with_plans}</div>
              <div className="text-sm text-ep-secondary">Municipalities</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-coral">{stats.total_recommendations}</div>
              <div className="text-sm text-ep-secondary">Recommendations</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-navy">{stats.total_sections}</div>
              <div className="text-sm text-ep-secondary">Text Sections</div>
            </div>
          </div>
          <p className="text-sm text-ep-secondary mt-4 text-center">
            The MVP focuses on Open Space & Recreation Plans from the NSPC subregion.
            The platform is designed to expand to all 101 MAPC municipalities and multiple plan types.
          </p>
        </div>
      </section>

      {/* About MAPC */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-navy mb-4">About MAPC</h2>
        <div className="prose prose-sm max-w-none text-ep-text leading-relaxed">
          <p>
            The Metropolitan Area Planning Council (MAPC) is the regional planning agency serving
            the people who live and work in the 101 cities and towns of Metropolitan Boston.
            MAPC works toward sound management of natural resources, sustainable development,
            and the collaborative provision of public services.
          </p>
        </div>
      </section>

      {/* Data Pipeline */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-navy mb-4">How It Works</h2>
        <div className="bg-white rounded-lg border p-6">
          <ol className="space-y-3">
            {[
              'Source PDF plan documents are collected from municipal websites.',
              'A Python data pipeline extracts text, detects headings, and parses sections.',
              'Sections are tagged with topics using keyword taxonomy matching.',
              'Recommendations are extracted using pattern-based heuristics.',
              'All data is stored in a SQLite database with full-text search indexes.',
              'The Next.js web application provides search, browse, and analysis interfaces.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal text-white text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-ep-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex flex-wrap justify-center gap-3 pt-6 border-t">
        <Link href="/" className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-forest">Home</Link>
        <Link href="/map" className="px-4 py-2 bg-white border rounded-lg text-sm text-navy hover:bg-gray-50">Map</Link>
        <Link href="/plans" className="px-4 py-2 bg-white border rounded-lg text-sm text-navy hover:bg-gray-50">Plans</Link>
        <Link href="/recommendations" className="px-4 py-2 bg-white border rounded-lg text-sm text-navy hover:bg-gray-50">Recommendations</Link>
        <Link href="/dashboard" className="px-4 py-2 bg-white border rounded-lg text-sm text-navy hover:bg-gray-50">Dashboard</Link>
      </div>
    </div>
  );
}
