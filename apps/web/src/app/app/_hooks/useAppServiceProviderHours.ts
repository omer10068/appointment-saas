'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardWorkingHourDto } from '@appointment/contracts';
import { fetchServiceProviderWorkingHours } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

export function useAppServiceProviderHours(
  businessId: string | null,
  serviceProviderId: string | null,
): DashboardWorkingHourDto[] {
  const { getToken } = useAuth();
  const { data } = useQuery({
    queryKey: appKeys.serviceProviderHours(businessId!, serviceProviderId!),
    queryFn: () =>
      fetchServiceProviderWorkingHours(businessId!, serviceProviderId!, getToken),
    enabled: !!businessId && !!serviceProviderId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data ?? [];
}
