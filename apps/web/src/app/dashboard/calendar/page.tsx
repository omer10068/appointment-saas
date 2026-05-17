'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import type {
  AppointmentStatus,
  DashboardAppointmentDto,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { fetchDashboardAppointments } from '../../../lib/api';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatWeekRange(start: Date, end: Date, locale: string): string {
  const startFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  });
  const endFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusBadgeClass(status: AppointmentStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'COMPLETED':
      return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800';
    case 'CANCELLED_BY_CUSTOMER':
    case 'CANCELLED_BY_BUSINESS':
      return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
    case 'NO_SHOW':
      return 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  }
}

type TList = ReturnType<typeof useDashboardI18n>['appointmentsList'];

function statusLabel(status: AppointmentStatus, t: TList): string {
  switch (status) {
    case 'SCHEDULED': return t.statusScheduled;
    case 'CONFIRMED': return t.statusConfirmed;
    case 'CANCELLED_BY_CUSTOMER': return t.statusCancelledByCustomer;
    case 'CANCELLED_BY_BUSINESS': return t.statusCancelledByBusiness;
    case 'COMPLETED': return t.statusCompleted;
    case 'NO_SHOW': return t.statusNoShow;
  }
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  locale,
  tList,
}: {
  appt: DashboardAppointmentDto;
  locale: string;
  tList: TList;
}) {
  return (
    <div className="rounded border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-1.5 mb-1.5 shadow-sm">
      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
        {formatTime(appt.startsAt, locale)} · {appt.customerName}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate mt-0.5">
        {appt.serviceName}
      </p>
      {appt.staffMemberName && (
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate">
          {appt.staffMemberName}
        </p>
      )}
      <span
        className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusBadgeClass(appt.status as AppointmentStatus)}`}
      >
        {statusLabel(appt.status as AppointmentStatus, tList)}
      </span>
    </div>
  );
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({
  day,
  dayName,
  appointments,
  isToday,
  locale,
  tList,
}: {
  day: Date;
  dayName: string;
  appointments: DashboardAppointmentDto[];
  isToday: boolean;
  locale: string;
  tList: TList;
}) {
  const sorted = appointments
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div
      className={`flex flex-col rounded-lg border ${
        isToday
          ? 'border-blue-400 dark:border-blue-500'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Day header */}
      <div
        className={`px-2 py-2 text-center rounded-t-lg border-b ${
          isToday
            ? 'bg-blue-600 text-white border-blue-500'
            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            isToday ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {dayName}
        </p>
        <p
          className={`text-lg font-bold leading-tight ${
            isToday
              ? 'text-white'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {day.getDate()}
        </p>
      </div>

      {/* Appointments list */}
      <div className="flex-1 p-1.5 overflow-y-auto max-h-80 min-h-[120px]">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center pt-4 select-none">
            —
          </p>
        ) : (
          sorted.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              locale={locale}
              tList={tList}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { getToken } = useAuth();
  const { currentBusinessId: businessId } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.calendar;
  const tList = dict.appointmentsList;
  const p = dict.pages.calendar;
  const isRtl = dict.dir === 'rtl';

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [appointments, setAppointments] = useState<DashboardAppointmentDto[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  const apptsByDay = weekDays.map((day) =>
    appointments.filter((a) => isSameDay(new Date(a.startsAt), day)),
  );

  const loadErrorText = t.loadError;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    setAppointments([]);
    setError(null);
    setLoading(true);

    const from = weekStart.toISOString();
    const end = addDays(weekStart, 6);
    end.setHours(23, 59, 59, 999);
    const to = end.toISOString();

    fetchDashboardAppointments(businessId, () => getTokenRef.current(), {
      from,
      to,
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
  }, [businessId, weekStart, loadErrorText]);

  function goToPrevWeek() {
    setWeekStart((d) => addDays(d, -7));
  }
  function goToNextWeek() {
    setWeekStart((d) => addDays(d, 7));
  }
  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  const weekRangeLabel = formatWeekRange(weekStart, weekEnd, dict.lang);
  const dayNames = dict.availability.days;

  const prevChevron = isRtl ? '›' : '‹';
  const nextChevron = isRtl ? '‹' : '›';

  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      {/* Navigation controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrevWeek}
            title={t.prevWeek}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base leading-none"
          >
            {prevChevron}
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[190px] text-center">
            {weekRangeLabel}
          </span>
          <button
            onClick={goToNextWeek}
            title={t.nextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base leading-none"
          >
            {nextChevron}
          </button>
          <button
            onClick={goToToday}
            className="px-3 h-8 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t.today}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/appointments"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t.viewAllAppointments}
          </Link>
          <Link
            href="/dashboard/appointments"
            className="px-3 h-8 inline-flex items-center text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t.addAppointment}
          </Link>
        </div>
      </div>

      {/* No business selected */}
      {!businessId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-16">
          {p.emptyTitle}
        </p>
      )}

      {/* Loading */}
      {businessId && loading && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-16">
          …
        </p>
      )}

      {/* Error */}
      {businessId && !loading && error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center py-8">
          {error}
        </p>
      )}

      {/* Week grid */}
      {businessId && !error && (
        <>
          <div className="overflow-x-auto -mx-1 pb-1">
            <div className="grid grid-cols-7 gap-2 min-w-[700px] px-1">
              {weekDays.map((day, i) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  dayName={dayNames[i as 0 | 1 | 2 | 3 | 4 | 5 | 6]}
                  appointments={apptsByDay[i]}
                  isToday={isSameDay(day, today)}
                  locale={dict.lang}
                  tList={tList}
                />
              ))}
            </div>
          </div>

          {!loading && appointments.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              {t.noAppointmentsThisWeek}
            </p>
          )}
        </>
      )}
    </>
  );
}
