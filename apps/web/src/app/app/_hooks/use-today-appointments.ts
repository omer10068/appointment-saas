'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { AppointmentStatus } from '@appointment/contracts';
import { fetchDashboardAppointments } from '@/lib/api';
import { mapDtoToAppointment } from '../_lib/calendar.mappers';
import type { Appointment, Service } from '../_lib/calendar.types';
import { businessDayRange } from '../_lib/calendar.utils';

export interface TodaySummary {
  totalToday: number;
  remainingToday: number;
  completedToday: number;
}

export interface UseTodayAppointmentsResult {
  appointments: Appointment[];
  summary: TodaySummary | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const CANCELLED = new Set<string>([
  AppointmentStatus.CANCELLED_BY_CUSTOMER,
  AppointmentStatus.CANCELLED_BY_BUSINESS,
]);

const ACTIVE = new Set<string>([
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
]);

// Empty service map: mapDtoToAppointment falls back to dto.serviceName and
// a deterministic color from serviceId, so no full service list is needed here.
const EMPTY_SERVICE_MAP = new Map<string, Service>();

export function useTodayAppointments(
  businessId: string | null,
  timezone: string | undefined,
): UseTodayAppointmentsResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['app', 'appointments', 'today', businessId] as const,
    queryFn: async () => {
      const tz = timezone ?? 'UTC';
      const { from, to } = businessDayRange(tz);
      const dtos = await fetchDashboardAppointments(businessId!, getToken, { from, to });

      const now = new Date();
      const totalToday     = dtos.filter((d) => !CANCELLED.has(d.status)).length;
      const remainingToday = dtos.filter(
        (d) => ACTIVE.has(d.status) && new Date(d.startsAt) > now,
      ).length;
      const completedToday = dtos.filter(
        (d) => d.status === AppointmentStatus.COMPLETED,
      ).length;

      const mapped = dtos
        .map((dto) => mapDtoToAppointment(dto, EMPTY_SERVICE_MAP))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return {
        appointments: mapped,
        summary: { totalToday, remainingToday, completedToday } satisfies TodaySummary,
      };
    },
    enabled: !!businessId,
    staleTime: 30_000,
    retry: false,
  });

  return {
    appointments: data?.appointments ?? [],
    summary: data?.summary ?? null,
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת הנתונים' : null,
    retry: () => { void refetch(); },
  };
}
