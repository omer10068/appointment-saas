import { AdminPageHeader } from '../_components/AdminPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Global platform configuration and admin preferences."
      />
      <EmptyState
        title="Platform settings coming soon"
        description="Feature flags, default configurations, and global policies will be managed here."
      />
    </>
  );
}
