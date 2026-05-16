import { AdminPageHeader } from './_components/AdminPageHeader';
import { AdminCard } from './_components/AdminCard';
import { EmptyState } from './_components/EmptyState';

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Platform overview and quick stats."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminCard title="Total Businesses" />
        <AdminCard title="Total Users" />
        <AdminCard title="Appointments Today" />
        <AdminCard title="Active Issues" />
      </div>

      <EmptyState
        title="Dashboard analytics coming soon"
        description="Real-time stats, recent activity, and platform health will appear here."
      />
    </>
  );
}
