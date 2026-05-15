import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function CustomersPage() {
  return (
    <>
      <DashboardPageHeader
        title="Customers"
        description="Manage your customers and their booking history."
      />
      <EmptyState
        title="Customer management coming soon"
        description="Add customers, view their appointment history, and manage their access to your business."
      />
    </>
  );
}
