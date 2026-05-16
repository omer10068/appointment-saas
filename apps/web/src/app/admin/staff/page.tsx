import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminStaffPage() {
  return (
    <>
      <AdminPageHeader
        title="Staff"
        description="Staff members registered across all businesses on the platform."
      />
      <EmptyState
        title="Staff management coming soon"
        description="View and manage staff members and their business assignments."
      />
    </>
  );
}
