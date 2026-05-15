import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AvailabilityPage() {
  return (
    <>
      <DashboardPageHeader
        title="Availability"
        description="Set working hours and availability for your business and staff."
      />
      <EmptyState
        title="Availability settings coming soon"
        description="Define open hours, staff schedules, breaks, and block unavailable time slots."
      />
    </>
  );
}
