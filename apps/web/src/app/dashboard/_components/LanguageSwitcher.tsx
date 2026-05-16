'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { COOKIE_NAME, LOCALES } from '../_i18n/config';
import type { Locale } from '../_i18n/types';

export function LanguageSwitcher() {
  const dict = useDashboardI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: Locale) {
    document.cookie = `${COOKIE_NAME}=${locale};path=/dashboard;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={dict.languageSwitcher.label}
      className="flex items-center rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800"
    >
      {LOCALES.map((locale) => {
        const isActive = dict.locale === locale;
        return (
          <button
            key={locale}
            onClick={() => !isActive && switchLocale(locale)}
            disabled={isPending}
            aria-pressed={isActive}
            className={[
              'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
              isActive
                ? 'bg-white text-gray-900 shadow-sm cursor-default dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 cursor-pointer dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {dict.languageSwitcher[locale]}
          </button>
        );
      })}
    </div>
  );
}
