'use client';

import { useState, useCallback } from 'react';
import type { DashboardDictionary } from '../_i18n/types';
import type { Theme } from '../_theme/config';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

export function DashboardShell({
  dict,
  theme,
  children,
}: {
  dict:     DashboardDictionary;
  theme:    Theme;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobileMenu  = useCallback(() => setMobileOpen(true),  []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  return (
    <div
      className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950${theme === 'dark' ? ' dark' : ''}`}
      dir={dict.dir}
      lang={dict.lang}
    >
      <DashboardSidebar
        dict={dict}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileMenu}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader
          dict={dict}
          theme={theme}
          onMenuOpen={openMobileMenu}
          mobileMenuOpen={mobileOpen}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
