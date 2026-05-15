import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AppointmentsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Appointments"
        description="Manage and track all appointments for your business."
      />
      <EmptyState
        title="Appointment management coming soon"
        description="View, create, reschedule, and cancel appointments with your customers."
      />
    </>
  );
}
