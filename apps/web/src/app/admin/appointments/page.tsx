import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminAppointmentsPage() {
  return (
    <>
      <AdminPageHeader
        title="Appointments"
        description="All appointments scheduled across every business on the platform."
      />
      <EmptyState
        title="Appointments overview coming soon"
        description="Monitor, filter, and inspect appointments platform-wide from this section."
      />
    </>
  );
}
