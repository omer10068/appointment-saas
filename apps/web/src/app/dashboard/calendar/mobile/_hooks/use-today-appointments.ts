'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    if (!businessId) return;
    const tz = timezone ?? 'UTC';
    const { from, to } = businessDayRange(tz);
    const req = ++reqRef.current;

    setLoading(true);
    setError(null);

    try {
      const dtos = await fetchDashboardAppointments(businessId, getToken, { from, to });
      if (req !== reqRef.current) return;

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

      setSummary({ totalToday, remainingToday, completedToday });
      setAppointments(mapped);
    } catch {
      if (req !== reqRef.current) return;
      setError('שגיאה בטעינת הנתונים');
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [businessId, timezone, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return { appointments, summary, loading, error, retry: load };
}
