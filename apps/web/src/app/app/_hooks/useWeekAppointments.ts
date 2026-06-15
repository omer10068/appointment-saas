'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardAppointmentDto } from '@appointment/contracts';
import { fetchDashboardAppointments } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';

interface UseWeekAppointmentsResult {
  rawAppointments: DashboardAppointmentDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeekAppointments(
  businessId: string | null,
  weekStartISO: string,
): UseWeekAppointmentsResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: appKeys.weekAppointments(businessId!, weekStartISO),
    queryFn: () => {
      // Reconstruct the Date from the ISO string so local-time arithmetic
      // (setDate / setHours) produces the same week window as the original hook.
      const from = new Date(weekStartISO);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return fetchDashboardAppointments(businessId!, getToken, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
    },
    enabled: !!businessId && !!weekStartISO,
    staleTime: 0,
    retry: false,
  });

  return {
    rawAppointments: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת הנתונים' : null,
    refetch: () => { void refetch(); },
  };
}
