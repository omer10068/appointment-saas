import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function BusinessProfilePage() {
  return (
    <>
      <DashboardPageHeader
        title="Business Profile"
        description="Update your business information, contact details, and public profile."
      />
      <EmptyState
        title="Business profile editor coming soon"
        description="Edit your business name, description, location, timezone, and contact information."
      />
    </>
  );
}
