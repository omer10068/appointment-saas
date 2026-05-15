import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function ServicesPage() {
  return (
    <>
      <DashboardPageHeader
        title="Services"
        description="Configure the services your business offers."
      />
      <EmptyState
        title="Service configuration coming soon"
        description="Define services, durations, pricing, and buffers that customers can book."
      />
    </>
  );
}
