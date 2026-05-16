'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { THEME_COOKIE } from '../_theme/config';
import type { Theme } from '../_theme/config';

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeSwitcher({ theme }: { theme: Theme }) {
  const dict = useDashboardI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: Theme = theme === 'light' ? 'dark' : 'light';
  const label =
    theme === 'light'
      ? dict.themeSwitcher.switchToDark
      : dict.themeSwitcher.switchToLight;

  function toggle() {
    document.cookie = `${THEME_COOKIE}=${next};path=/dashboard;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={label}
      title={label}
      className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
