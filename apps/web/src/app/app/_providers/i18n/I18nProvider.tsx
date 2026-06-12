'use client';

import { createContext, useContext } from 'react';
import type { AppDictionary } from './types';

const I18nContext = createContext<AppDictionary | null>(null);

export function I18nProvider({
  dict,
  children,
}: {
  dict: AppDictionary;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={dict}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): AppDictionary {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
