'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardServiceDto } from '@appointment/contracts';
import { fetchDashboardServices } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

interface UseAppServicesResult {
  services: DashboardServiceDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAppServices(businessId: string | null): UseAppServicesResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: appKeys.services(businessId!),
    queryFn: () => fetchDashboardServices(businessId!, getToken),
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    services: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת שירותים' : null,
    refetch: () => { void refetch(); },
  };
}
