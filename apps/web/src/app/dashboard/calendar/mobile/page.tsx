import { redirect } from 'next/navigation';

// This route renders inside the desktop DashboardShell which is wrong.
// The mobile calendar lives at /mobile/calendar.
export default function MobileCalendarRedirect() {
  redirect('/mobile/calendar');
}
