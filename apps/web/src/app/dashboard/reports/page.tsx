import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function ReportsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Reports"
        description="View activity summaries, booking trends, and business insights."
      />
      <EmptyState
        title="Reports and insights coming soon"
        description="Track appointments over time, revenue trends, customer retention, and staff utilization."
      />
    </>
  );
}
