import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { EmptyState } from '../../_components/EmptyState';

export default async function BusinessDetailsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  return (
    <>
      <AdminPageHeader
        title="Business Details"
        description={`Viewing business: ${businessId}`}
      />
      <EmptyState
        title="Business details coming soon"
        description="Settings, services, staff, customers, and appointments for this business will be managed here."
      />
    </>
  );
}
