'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { BusinessUserWithBusinessDto } from './types';

export const BUSINESS_COOKIE = 'dashboard_business_id';

export interface BusinessContextValue {
  businesses: BusinessUserWithBusinessDto[];
  currentBusiness: BusinessUserWithBusinessDto | null;
  currentBusinessId: string | null;
  setCurrentBusinessId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

const BusinessContext =
  createContext<BusinessContextValue | null>(null);

function writeBusinessCookie(id: string | null): void {
  if (typeof document === 'undefined') return;
  if (id) {
    document.cookie = `${BUSINESS_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    document.cookie = `${BUSINESS_COOKIE}=; path=/; max-age=0`;
  }
}

function resolveSelectedId(
  businesses: BusinessUserWithBusinessDto[],
  persistedId: string | null,
): string | null {
  if (businesses.length === 0) return null;
  if (businesses.length === 1) return businesses[0].business.id;

  if (persistedId && businesses.some((bu) => bu.business.id === persistedId)) {
    return persistedId;
  }
  return businesses[0].business.id;
}

export function BusinessProvider({
  initialBusinesses,
  initialSelectedId,
  children,
}: {
  initialBusinesses: BusinessUserWithBusinessDto[];
  initialSelectedId: string | null;
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveSelectedId(initialBusinesses, initialSelectedId),
  );

  const currentBusiness = selectedId
    ? (initialBusinesses.find((bu) => bu.business.id === selectedId) ?? null)
    : null;

  const setCurrentBusinessId = useCallback(
    (id: string) => {
      const valid = initialBusinesses.some((bu) => bu.business.id === id);
      if (!valid) return;
      setSelectedId(id);
      writeBusinessCookie(id);
    },
    [initialBusinesses],
  );

  // Write the resolved (possibly corrected) id to the cookie on mount
  useEffect(() => {
    writeBusinessCookie(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: BusinessContextValue = {
    businesses: initialBusinesses,
    currentBusiness,
    currentBusinessId: selectedId,
    setCurrentBusinessId,
    isLoading: false,
    error: null,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx)
    throw new Error(
      'useBusiness must be used inside BusinessProvider',
    );
  return ctx;
}
