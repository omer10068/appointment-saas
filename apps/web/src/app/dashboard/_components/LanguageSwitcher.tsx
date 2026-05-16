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
    <div className="flex items-center gap-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          disabled={isPending || dict.locale === locale}
          className={[
            'px-2.5 py-1 text-xs font-medium rounded transition-colors',
            dict.locale === locale
              ? 'bg-indigo-50 text-indigo-700 cursor-default'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer',
          ].join(' ')}
        >
          {dict.languageSwitcher[locale]}
        </button>
      ))}
    </div>
  );
}
