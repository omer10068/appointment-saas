import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminAuditLogsPage() {
  return (
    <>
      <AdminPageHeader
        title="Audit Logs"
        description="Activity history and administrative action log for the platform."
      />
      <EmptyState
        title="Audit log coming soon"
        description="A tamper-evident log of all admin and system actions will be available here."
      />
    </>
  );
}
