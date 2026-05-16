import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminOwnersPage() {
  return (
    <>
      <AdminPageHeader
        title="Owners"
        description="Platform users with the Owner role across all businesses."
      />
      <EmptyState
        title="Owner management coming soon"
        description="Assign, change, or remove business owners from this section."
      />
    </>
  );
}
