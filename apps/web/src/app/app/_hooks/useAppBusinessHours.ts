'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardWorkingHourDto } from '@appointment/contracts';
import { fetchBusinessWorkingHours } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

/**
 * Fetches the business working hours for the given businessId.
 * Uses a 5-minute staleTime — hours rarely change during a session.
 * Returns an empty array when businessId is null or data is not yet loaded.
 */
export function useAppBusinessHours(businessId: string | null): DashboardWorkingHourDto[] {
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: appKeys.businessHours(businessId!),
    queryFn: () => fetchBusinessWorkingHours(businessId!, getToken),
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return data ?? [];
}
