'use client';

import { createContext, useContext } from 'react';
import type { DashboardDictionary } from './types';

const DashboardI18nContext = createContext<DashboardDictionary | null>(null);

export function DashboardI18nProvider({
  dict,
  children,
}: {
  dict: DashboardDictionary;
  children: React.ReactNode;
}) {
  return (
    <DashboardI18nContext.Provider value={dict}>
      {children}
    </DashboardI18nContext.Provider>
  );
}

export function useDashboardI18n(): DashboardDictionary {
  const ctx = useContext(DashboardI18nContext);
  if (!ctx) throw new Error('useDashboardI18n must be used inside DashboardI18nProvider');
  return ctx;
}
