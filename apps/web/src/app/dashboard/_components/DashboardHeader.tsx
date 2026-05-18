'use client';

import { useUser } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { DashboardDictionary } from '../_i18n/types';
import type { Theme } from '../_theme/config';

function useGreeting(locale: DashboardDictionary['locale']): string {
  const { user, isLoaded } = useUser();

  const prefix = locale === 'he' ? 'שלום' : 'Hello';

  if (!isLoaded || !user) return prefix;

  const name =
    user.firstName ??
    user.fullName ??
    user.primaryEmailAddress?.emailAddress ??
    null;

  return name ? `${prefix}, ${name}` : prefix;
}

export function DashboardHeader({
  dict,
  theme,
  onMenuOpen,
  mobileMenuOpen,
}: {
  dict:           DashboardDictionary;
  theme:          Theme;
  onMenuOpen:     () => void;
  mobileMenuOpen: boolean;
}) {
  const greeting = useGreeting(dict.locale);

  return (
    <header className="shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center dark:bg-gray-900 dark:border-gray-800">
      {/* Left slot — hamburger on mobile, empty on desktop */}
      <div className="flex-1 min-w-0">
        <button
          onClick={onMenuOpen}
          aria-label={dict.header.openMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-mobile-nav"
          className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Center — greeting, max-width so very long names don't crowd the sides */}
      <p className="shrink-0 max-w-[50%] truncate px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {greeting}
      </p>

      {/* Right slot — ThemeSwitcher, pinned to the end */}
      <div className="flex-1 min-w-0 flex justify-end">
        <ThemeSwitcher theme={theme} />
      </div>
    </header>
  );
}
