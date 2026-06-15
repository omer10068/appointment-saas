'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardServiceProviderDto } from '@appointment/contracts';
import { fetchDashboardServiceProviders } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

interface UseAppServiceProvidersResult {
  providers: DashboardServiceProviderDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAppServiceProviders(
  businessId: string | null,
): UseAppServiceProvidersResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: appKeys.serviceProviders(businessId!),
    queryFn: () => fetchDashboardServiceProviders(businessId!, getToken),
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    providers: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת ספקי שירות' : null,
    refetch: () => { void refetch(); },
  };
}
