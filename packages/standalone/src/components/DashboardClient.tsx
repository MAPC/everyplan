'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, MapPin, Lightbulb, Layers, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { DashboardStats } from '@/lib/types';
import { TOPIC_FAMILIES, RECOMMENDATION_CATEGORIES, PLAN_TYPES } from '@/lib/types';

const CHART_COLORS = ['#2E9E78', '#2E75B6', '#D85A30', '#BA7517', '#534AB7', '#1B4F72', '#43C99B', '#1B6B52'];

function StatCard({ icon: Icon, value, label, color, href }: { icon: React.ElementType; value: number | string; label: string; color: string; href?: string }) {
  const content = (
    <>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-navy">{value}</div>
        <div className="text-xs text-ep-secondary">{label}</div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="bg-white rounded-lg border p-5 flex items-center gap-4 hover:shadow-md hover:border-blue/30 transition-all">
        {content}
      </Link>
    );
  }
  return <div className="bg-white rounded-lg border p-5 flex items-center gap-4">{content}</div>;
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  // Prepare chart data
  const topicData = stats.top_topics.map(t => ({
    name: TOPIC_FAMILIES[t.topic]?.label || t.topic,
    count: t.count,
  }));

  const recCatData = Object.entries(stats.recommendations_by_category)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      name: RECOMMENDATION_CATEGORIES[cat]?.label || cat,
      value: count,
    }));

  const yearData = Object.entries(stats.plans_by_year)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([year, count]) => ({ year, count }));

  const statusData = Object.entries(stats.plans_by_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} value={stats.total_plans} label="Plans Indexed" color="bg-teal" href="/plans" />
        <StatCard icon={MapPin} value={stats.municipalities_with_plans} label="Municipalities" color="bg-blue" href="/map" />
        <StatCard icon={Lightbulb} value={stats.total_recommendations} label="Recommendations" color="bg-coral" href="/recommendations" />
        <StatCard icon={Layers} value={stats.total_sections} label="Text Sections" color="bg-navy" href="/plans" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Topics */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-medium text-navy mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Top Topics Across Plans
          </h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={10} width={130} tick={{ fill: '#555' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#2E9E78" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendations by Category */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-medium text-navy mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Recommendations by Category
          </h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={recCatData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {recCatData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plans by Year */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-medium text-navy mb-4">Plans by Year Adopted</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData} margin={{ bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#2E75B6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plans by Status */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-medium text-navy mb-4">Plans by Adoption Status</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  fontSize={12}
                >
                  <Cell fill="#2E9E78" />
                  <Cell fill="#BA7517" />
                  <Cell fill="#999" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend fontSize={12} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Topic Tag Cloud */}
      <div className="bg-white rounded-lg border p-5 mt-6">
        <h3 className="text-sm font-medium text-navy mb-4">All Topic Tags</h3>
        <div className="flex flex-wrap gap-2">
          {stats.top_topics.map(({ topic, count }) => {
            const f = TOPIC_FAMILIES[topic];
            if (!f) return null;
            const size = Math.max(12, Math.min(18, 10 + count / 20));
            return (
              <Link
                key={topic}
                href={`/recommendations?topic=${encodeURIComponent(topic)}`}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium hover:opacity-80 transition-opacity ${f.bg} ${f.text}`}
                style={{ fontSize: size }}
              >
                {f.label}
                <span className="opacity-60 text-xs">({count})</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
