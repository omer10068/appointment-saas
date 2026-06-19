'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { fetchAdminBusinesses, type AdminBusinessListItemDto } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { adminKeys } from '../_components/admin-access-gate';

interface UseAdminBusinessesResult {
  businesses: AdminBusinessListItemDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminBusinesses(): UseAdminBusinessesResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: adminKeys.businesses,
    queryFn: () => fetchAdminBusinesses(getToken),
    staleTime: 60_000,
    retry: false,
  });

  // 403 is already handled by AdminAccessGate — don't surface a redundant error here
  const errorMessage =
    isError && !(error instanceof ApiError && error.status === 403)
      ? 'שגיאה בטעינת עסקים'
      : null;

  return {
    businesses: data ?? [],
    loading: isLoading,
    error: errorMessage,
    refetch: () => { void refetch(); },
  };
}
