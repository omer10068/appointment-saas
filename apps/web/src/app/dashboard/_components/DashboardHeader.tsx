'use client';

import { SignOutButton } from '@clerk/nextjs';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { DashboardDictionary } from '../_i18n/types';
import type { Theme } from '../_theme/config';

export function DashboardHeader({
  email,
  dict,
  theme,
}: {
  email?: string;
  dict: DashboardDictionary;
  theme: Theme;
}) {
  return (
    <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between dark:bg-gray-900 dark:border-gray-800">
      {email ? (
        <span className="text-sm text-gray-500 dark:text-gray-400">{email}</span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher theme={theme} />
        <SignOutButton>
          <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            {dict.header.signOut}
          </button>
        </SignOutButton>
      </div>
    </header>
  );
}
