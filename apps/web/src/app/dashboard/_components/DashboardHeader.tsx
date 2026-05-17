'use client';

import { SignOutButton } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { BusinessSwitcher } from './BusinessSwitcher';
import type { DashboardDictionary } from '../_i18n/types';
import type { Theme } from '../_theme/config';

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
  return (
    <header className="shrink-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center gap-3 dark:bg-gray-900 dark:border-gray-800">
      {/* Mobile hamburger — hidden on desktop */}
      <button
        onClick={onMenuOpen}
        aria-label={dict.header.openMenu}
        aria-expanded={mobileMenuOpen}
        aria-controls="dashboard-mobile-nav"
        className="lg:hidden shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Business switcher — takes remaining space */}
      <div className="flex-1 min-w-0">
        <BusinessSwitcher />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
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
