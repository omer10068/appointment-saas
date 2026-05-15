import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminBusinessUsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Business Users"
        description="All users associated with businesses across the platform."
      />
      <EmptyState
        title="Business user management coming soon"
        description="View and manage owners, managers, and staff members across all businesses."
      />
    </>
  );
}
