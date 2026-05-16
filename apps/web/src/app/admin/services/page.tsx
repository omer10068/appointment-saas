import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminServicesPage() {
  return (
    <>
      <AdminPageHeader
        title="Services"
        description="Services offered by businesses across the platform."
      />
      <EmptyState
        title="Services overview coming soon"
        description="Browse all services configured by businesses on the platform."
      />
    </>
  );
}
