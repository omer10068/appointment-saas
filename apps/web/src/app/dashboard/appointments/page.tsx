import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { EmptyState } from '../_components/EmptyState';
import { getServerDict } from '../_i18n/getServerDict';

export default async function AppointmentsPage() {
  const dict = await getServerDict();
  const p = dict.pages.appointments;
  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />
      <EmptyState title={p.emptyTitle} description={p.emptyDescription} comingSoon={dict.comingSoon} />
    </>
  );
}
