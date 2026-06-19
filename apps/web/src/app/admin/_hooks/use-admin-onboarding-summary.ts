'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  fetchAdminOnboardingSummary,
  type AdminOnboardingSummaryDto,
} from '@/lib/admin-api';

interface UseAdminOnboardingSummaryResult {
  summary: AdminOnboardingSummaryDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminOnboardingSummary(
  businessId: string,
): UseAdminOnboardingSummaryResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'onboarding-summary', businessId],
    queryFn: () => fetchAdminOnboardingSummary(businessId, getToken),
    staleTime: 30_000,
    retry: false,
    enabled: !!businessId,
  });

  return {
    summary: data ?? null,
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת פרטי ההקמה' : null,
    refetch: () => { void refetch(); },
  };
}
