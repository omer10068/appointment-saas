import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { BusinessAwareEmptyState } from '../_components/BusinessAwareEmptyState';
import { getServerDict } from '../_i18n/getServerDict';

export default async function ReportsPage() {
  const dict = await getServerDict();
  const p = dict.pages.reports;
  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />
      <BusinessAwareEmptyState
        title={p.emptyTitle}
        emptyDescription={p.emptyDescription}
        managesFor={p.managesFor}
        comingSoon={dict.comingSoon}
      />
    </>
  );
}
