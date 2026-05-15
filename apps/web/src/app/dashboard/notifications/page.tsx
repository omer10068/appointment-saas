import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';

export default function NotificationsPage() {
  return (
    <>
      <DashboardPageHeader
        title="Notifications"
        description="Stay on top of booking requests, reminders, and messages from customers."
      />
      <EmptyState
        title="Notifications coming soon"
        description="Receive alerts for new bookings, cancellations, and customer messages in one place."
      />
    </>
  );
}
