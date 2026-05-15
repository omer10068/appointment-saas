import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function CalendarPage() {
  return (
    <>
      <DashboardPageHeader
        title="Calendar"
        description="View your appointments and staff schedule in a calendar view."
      />
      <EmptyState
        title="Calendar view coming soon"
        description="A day, week, and month view of all your bookings and staff availability."
      />
    </>
  );
}
