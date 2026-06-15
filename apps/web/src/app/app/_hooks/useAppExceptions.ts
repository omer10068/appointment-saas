'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardAvailabilityExceptionDto } from '@appointment/contracts';
import { fetchAvailabilityExceptions } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

interface UseAppExceptionsResult {
  exceptions: DashboardAvailabilityExceptionDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAppExceptions(businessId: string | null): UseAppExceptionsResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: appKeys.exceptions(businessId!),
    queryFn: () => fetchAvailabilityExceptions(businessId!, getToken),
    enabled: !!businessId,
    staleTime: 60_000,
    retry: false,
  });

  return {
    exceptions: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת החריגות' : null,
    refetch: () => { void refetch(); },
  };
}
