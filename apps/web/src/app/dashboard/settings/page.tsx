import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function SettingsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Settings"
        description="Configure your business preferences and account settings."
      />
      <EmptyState
        title="Business settings coming soon"
        description="Manage booking rules, cancellation policies, notification preferences, and integrations."
      />
    </>
  );
}
