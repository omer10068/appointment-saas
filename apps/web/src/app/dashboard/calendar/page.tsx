'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  AppointmentStatus,
  DashboardAppointmentDto,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { fetchDashboardAppointments } from '../../../lib/api';
import { CalendarView, type CalendarAppointment, type CalendarLabels } from './_components/calendar-view';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}

// ─── Appointment mapping ───────────────────────────────────────────────────────

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const STATUS_MAP: Record<AppointmentStatus, CalendarAppointment['status']> = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED_BY_CUSTOMER: 'cancelled',
  CANCELLED_BY_BUSINESS: 'cancelled',
  NO_SHOW: 'no-show',
};

function mapAppointment(dto: DashboardAppointmentDto): CalendarAppointment {
  const start = new Date(dto.startsAt);
  const end = new Date(dto.endsAt);
  return {
    id: dto.id,
    customerName: dto.customerName,
    serviceName: dto.serviceName,
    staffMember: dto.serviceProviderName ?? '',
    startTime: toHHmm(start),
    endTime: toHHmm(end),
    status: STATUS_MAP[dto.status as AppointmentStatus] ?? 'scheduled',
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { getToken } = useAuth();
  const { currentBusinessId: businessId } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t     = dict.calendar;
  const tList = dict.appointmentsList;
  const p     = dict.pages.calendar;

  const calendarLabels: Partial<CalendarLabels> = {
    today: t.today,
    statuses: {
      scheduled: tList.statusScheduled,
      completed: tList.statusCompleted,
      cancelled: tList.statusCancelledByCustomer,
      noShow:    tList.statusNoShow,
    },
  };

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [appointments, setAppointments] = useState<DashboardAppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchRange, setFetchRange] = useState<{ from: Date; to: Date }>(() => {
    const from = getWeekStart(new Date());
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });

  const loadErrorText = t.loadError;

  const handleRangeChange = useCallback((from: Date, to: Date) => {
    setFetchRange((prev) => {
      if (
        prev.from.getTime() === from.getTime() &&
        prev.to.getTime() === to.getTime()
      ) {
        return prev;
      }
      return { from, to };
    });
  }, []);

  function handleRetry() {
    setError(null);
    setRetryCount((c) => c + 1);
  }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    setAppointments([]);
    setError(null);
    setLoading(true);

    fetchDashboardAppointments(businessId, () => getTokenRef.current(), {
      from: fetchRange.from.toISOString(),
      to: fetchRange.to.toISOString(),
    })
      .then((data) => {
        if (!cancelled) setAppointments(data);
      })
      .catch(() => {
        if (!cancelled) setError(loadErrorText);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, fetchRange, loadErrorText, retryCount]);

  const mappedAppointments = useMemo(
    () => appointments.map(mapAppointment),
    [appointments],
  );

  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      {!businessId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-16">
          {p.emptyTitle}
        </p>
      )}

      {businessId && (
        <CalendarView
          appointments={mappedAppointments}
          isLoading={loading}
          error={error}
          onRetry={handleRetry}
          onRangeChange={handleRangeChange}
          showHeader={false}
          locale={dict.lang}
          dir={dict.dir as 'ltr' | 'rtl'}
          labels={calendarLabels}
        />
      )}
    </>
  );
}
