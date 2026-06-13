'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardBusinessUserDto } from '@appointment/contracts';
import { fetchDashboardBusinessUsers } from '@/lib/api';

interface UseAppBusinessUsersResult {
  businessUsers: DashboardBusinessUserDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAppBusinessUsers(
  businessId: string | null,
  isOwner: boolean,
): UseAppBusinessUsersResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['app', 'businessUsers', businessId] as const,
    queryFn: () => fetchDashboardBusinessUsers(businessId!, getToken),
    enabled: !!businessId && isOwner,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    businessUsers: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת הצוות' : null,
    refetch: () => { void refetch(); },
  };
}
