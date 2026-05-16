import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminCustomersPage() {
  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="End customers who have appointments with businesses on the platform."
      />
      <EmptyState
        title="Customer management coming soon"
        description="View customer profiles and their booking history across all businesses."
      />
    </>
  );
}
