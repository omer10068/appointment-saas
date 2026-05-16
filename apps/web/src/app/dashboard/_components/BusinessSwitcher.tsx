'use client';

import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';

export function BusinessSwitcher() {
  const { businesses, currentBusiness, currentBusinessId, setCurrentBusinessId } =
    useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.businessSwitcher;

  if (businesses.length === 0) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm text-gray-400 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 select-none">
        {t.noActiveBusiness}
      </span>
    );
  }

  if (businesses.length === 1) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
        <span
          className="w-2 h-2 rounded-full bg-green-500 shrink-0"
          aria-hidden="true"
        />
        <span>{currentBusiness?.business.name}</span>
      </div>
    );
  }

  return (
    <select
      value={currentBusinessId ?? ''}
      onChange={(e) => setCurrentBusinessId(e.target.value)}
      aria-label={t.selectBusiness}
      className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      {businesses.map((bu) => (
        <option key={bu.business.id} value={bu.business.id}>
          {bu.business.name}
        </option>
      ))}
    </select>
  );
}
