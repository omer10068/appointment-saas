import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { BusinessAwareEmptyState } from '../_components/BusinessAwareEmptyState';
import { LanguageSwitcher } from '../_components/LanguageSwitcher';
import { getServerDict } from '../_i18n/getServerDict';

export default async function SettingsPage() {
  const dict = await getServerDict();
  const p = dict.pages.settings;
  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      {/* Account-level settings — visible regardless of selected business */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {dict.languageSwitcher.label}
          </span>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mt-6">
        <BusinessAwareEmptyState
          title={p.emptyTitle}
          emptyDescription={p.emptyDescription}
          managesFor={p.managesFor}
          comingSoon={dict.comingSoon}
        />
      </div>
    </>
  );
}
