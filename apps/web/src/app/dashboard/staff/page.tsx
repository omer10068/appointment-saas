import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function StaffPage() {
  return (
    <>
      <DashboardPageHeader
        title="Staff Members"
        description="Manage your team and their roles within the business."
      />
      <EmptyState
        title="Staff management coming soon"
        description="Add staff members, assign services they can perform, and manage their profiles."
      />
    </>
  );
}
