import { getDashboardStats } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const stats = getDashboardStats();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-navy">Dashboard</h1>
        <p className="text-ep-secondary mt-1">
          Summary statistics and visualizations across all indexed plans.
        </p>
      </div>
      <DashboardClient stats={stats} />
    </div>
  );
}
