'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import type { AppointmentStatus as ContractsStatus } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import {
  fetchDashboardServiceProviders,
  fetchDashboardServices,
  updateDashboardAppointmentStatus,
} from '../../../../../lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { CalendarAppointmentSheet } from './calendar-appointment-sheet';
import { CalendarCreateSheet } from './calendar-create-sheet';
import { useTodayAppointments } from '../_hooks/use-today-appointments';
import { mapDtoToService, mapDtoToServiceProvider } from '../_lib/calendar.mappers';
import { formatDate, formatTime } from '../_lib/calendar.utils';
import { LAYOUT, SERVICE_COLORS } from '../_lib/calendar.design';
import type {
  Appointment,
  AppointmentStatus,
  Service,
  ServiceProvider,
} from '../_lib/calendar.types';

// ─── Status badge config ──────────────────────────────────────────────────────
// Mirrors STATUS_BADGE in calendar-appointment-sheet; kept local to avoid
// cross-component coupling.

const STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  scheduled:             'bg-blue-50 text-blue-600',
  confirmed:             'bg-indigo-50 text-indigo-600',
  completed:             'bg-green-50 text-green-700',
  cancelled_by_customer: 'bg-gray-100 text-gray-400',
  cancelled_by_business: 'bg-gray-100 text-gray-400',
  no_show:               'bg-orange-50 text-orange-700',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:             'מתוכנן',
  confirmed:             'מאושר',
  completed:             'הושלם',
  cancelled_by_customer: 'בוטל',
  cancelled_by_business: 'בוטל',
  no_show:               'לא הגיע',
};

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  valueClass?: string;
}

function SummaryCard({ label, value, valueClass = 'text-gray-900 dark:text-gray-100' }: SummaryCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-gray-900 rounded-2xl py-4 px-2 shadow-sm border border-gray-100 dark:border-gray-800">
      <span className={`text-[28px] font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── Next appointment card ────────────────────────────────────────────────────

interface NextCardProps {
  appointment: Appointment;
  tz: string;
  onClick: () => void;
}

function NextAppointmentCard({ appointment, tz, onClick }: NextCardProps) {
  const c = SERVICE_COLORS[appointment.service.color];
  return (
    <button
      onClick={onClick}
      className={`w-full text-right ${c.bg} rounded-2xl px-4 py-4 active:brightness-95 transition-all shadow-sm border border-black/5`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-1 self-stretch rounded-full ${c.bar} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${c.metaText}`}>
            התור הבא
          </p>
          <p className={`text-[26px] font-bold leading-none tabular-nums ${c.customerText}`} dir="ltr">
            {formatTime(appointment.startTime, tz)}
          </p>
          <p className={`text-[14px] font-semibold leading-tight truncate mt-1.5 ${c.customerText}`}>
            {appointment.service.name}
          </p>
          <p className={`text-[12px] leading-tight truncate mt-0.5 ${c.serviceText}`}>
            {appointment.customer.name}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Appointment list row ─────────────────────────────────────────────────────

interface RowProps {
  appointment: Appointment;
  tz: string;
  onClick: () => void;
}

function AppointmentRow({ appointment, tz, onClick }: RowProps) {
  const c = SERVICE_COLORS[appointment.service.color];
  const isCancelled =
    appointment.status === 'cancelled_by_customer' ||
    appointment.status === 'cancelled_by_business';

  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 py-3',
        'border-b border-gray-100 dark:border-gray-800',
        'text-right transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.03]',
        isCancelled ? 'opacity-45' : '',
      ].join(' ')}
    >
      <div className={`w-1 h-8 rounded-full ${c.bar} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight',
            isCancelled ? 'line-through decoration-gray-400/50' : '',
          ].join(' ')}
        >
          {appointment.service.name}
        </p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate leading-tight">
          {appointment.customer.name}
        </p>
      </div>
      {/* Badge + time stacked on the right */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none ${STATUS_BADGE_CLASS[appointment.status]}`}
        >
          {STATUS_LABEL[appointment.status]}
        </span>
        <span
          className="text-[12px] tabular-nums font-medium text-gray-400 dark:text-gray-500"
          dir="ltr"
        >
          {formatTime(appointment.startTime, tz)}
        </span>
      </div>
    </button>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────

interface HomeCTAProps {
  canMutate: boolean;
  onNewAppointment: () => void;
  onCalendar: () => void;
}

function HomeCTA({ canMutate, onNewAppointment, onCalendar }: HomeCTAProps) {
  return (
    <button
      onClick={canMutate ? onNewAppointment : onCalendar}
      className="px-5 py-2.5 rounded-xl bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white text-[13px] font-medium active:opacity-75 transition-opacity"
    >
      {canMutate ? 'קביעת תור חדש' : 'פתח יומן'}
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-900 rounded-2xl py-4 px-2 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="h-7 w-8 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="flex gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="h-[106px] rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="w-1 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-10 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────

interface TodaySummary {
  totalToday: number;
  remainingToday: number;
  completedToday: number;
}

interface ContentProps {
  appointments: Appointment[];
  summary: TodaySummary;
  nextAppointment: Appointment | undefined;
  tz: string;
  canMutate: boolean;
  onSelect: (a: Appointment) => void;
  onNewAppointment: () => void;
  onCalendar: () => void;
}

function HomeContent({
  appointments,
  summary,
  nextAppointment,
  tz,
  canMutate,
  onSelect,
  onNewAppointment,
  onCalendar,
}: ContentProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="flex gap-3">
        <SummaryCard label="סה״כ תורים היום" value={summary.totalToday} />
        <SummaryCard
          label="נותרו היום"
          value={summary.remainingToday}
          valueClass="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          label="הושלמו"
          value={summary.completedToday}
          valueClass="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Next appointment or "no more" + CTA */}
      {nextAppointment ? (
        <NextAppointmentCard
          appointment={nextAppointment}
          tz={tz}
          onClick={() => onSelect(nextAppointment)}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-[13px] text-gray-400 dark:text-gray-500 text-center">
            אין עוד תורים להמשך היום
          </p>
          <HomeCTA
            canMutate={canMutate}
            onNewAppointment={onNewAppointment}
            onCalendar={onCalendar}
          />
        </div>
      )}

      {/* Today's list */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
          כל התורים היום
        </p>
        <div className="flex flex-col">
          {appointments.map((a) => (
            <AppointmentRow
              key={a.id}
              appointment={a}
              tz={tz}
              onClick={() => onSelect(a)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

// Cancelled statuses excluded from operational counts.
const CANCELLED_STATUS = new Set<AppointmentStatus>([
  'cancelled_by_customer',
  'cancelled_by_business',
]);
const ACTIVE_STATUS = new Set<AppointmentStatus>(['scheduled', 'confirmed']);

export function MobileHomeShell() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useDashboardBusiness();
  const businessName       = currentBusiness?.business.name;
  const businessId         = currentBusiness?.business.id ?? null;
  const timezone           = currentBusiness?.business.timezone;
  const currentUserId      = currentBusiness?.id; // BusinessUser.id
  const canMutate          =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  // ── Service providers + services (for provider-based filtering and create sheet) ──

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [services, setServices]                 = useState<Service[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setServiceProviders([]);
      setServices([]);
      return;
    }
    let cancelled = false;
    setProvidersLoading(true);

    Promise.all([
      fetchDashboardServiceProviders(businessId, () => getTokenRef.current()),
      fetchDashboardServices(businessId, () => getTokenRef.current()),
    ])
      .then(([providerDtos, serviceDtos]) => {
        if (cancelled) return;
        setServiceProviders(providerDtos.map(mapDtoToServiceProvider));
        // Only active services are offered in the create sheet.
        setServices(serviceDtos.filter((dto) => dto.isActive).map(mapDtoToService));
      })
      .catch(() => {
        // Graceful degradation: filter falls back to "show all" for OWNER/MANAGER.
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId]);

  // ── Today's appointments ──────────────────────────────────────────────────────

  const { appointments, loading, error, retry } = useTodayAppointments(
    businessId,
    timezone,
  );

  // ── Provider-based filtering ──────────────────────────────────────────────────
  //
  // Home is a personal daily view: show only appointments for the logged-in user's
  // linked ServiceProvider (matched via BusinessUser.id → ServiceProvider.businessUserId).
  // Fallback: OWNER/MANAGER without a linked provider see all; MEMBER sees nothing.

  const myProvider = serviceProviders.find(
    (sp) => sp.businessUserId === currentUserId,
  );

  let relevantAppointments: Appointment[];
  if (myProvider) {
    relevantAppointments = appointments.filter(
      (a) => a.provider.id === myProvider.id,
    );
  } else if (canMutate) {
    relevantAppointments = appointments;
  } else {
    relevantAppointments = [];
  }

  // Recompute summary from the filtered list so all counts align.
  const now = new Date();
  const relevantSummary: TodaySummary = {
    totalToday:     relevantAppointments.filter((a) => !CANCELLED_STATUS.has(a.status)).length,
    remainingToday: relevantAppointments.filter(
      (a) => ACTIVE_STATUS.has(a.status) && a.startTime > now,
    ).length,
    completedToday: relevantAppointments.filter((a) => a.status === 'completed').length,
  };

  const nextAppointment = relevantAppointments.find(
    (a) => ACTIVE_STATUS.has(a.status) && a.startTime > now,
  );

  // ── Sheet state ───────────────────────────────────────────────────────────────

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateSheet, setShowCreateSheet]         = useState(false);

  const tz         = timezone ?? 'UTC';
  const todayLabel = formatDate(new Date(), tz);

  const isLoading  = loading || providersLoading;

  // Whether the MEMBER has no linked provider (and therefore sees no appointments).
  const memberWithNoProvider = !canMutate && !myProvider;

  function openCreate()   { setShowCreateSheet(true); }
  function openCalendar() { router.push('/mobile/calendar'); }

  async function handleStatusUpdate(
    appointmentId: string,
    newStatus: ContractsStatus,
  ): Promise<void> {
    if (!businessId) return;
    await updateDashboardAppointmentStatus(
      businessId,
      appointmentId,
      { status: newStatus },
      () => getTokenRef.current(),
    );
    retry();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col overflow-hidden',
        'bg-gray-50 dark:bg-gray-950',
        'md:inset-auto md:top-1/2 md:left-1/2',
        'md:-translate-x-1/2 md:-translate-y-1/2',
        'md:w-107.5 md:h-[90dvh]',
        'md:rounded-4xl md:shadow-2xl md:overflow-hidden',
      ].join(' ')}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {businessName && (
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
            {businessName}
          </p>
        )}
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 leading-tight">
          דף הבית
        </h1>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">{todayLabel}</p>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-5"
        style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 16 }}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[14px] text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={retry}
              className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
            >
              נסה שוב
            </button>
          </div>
        ) : relevantAppointments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-[14px] text-gray-400 dark:text-gray-500">
              {memberWithNoProvider ? 'אין תורים מיוחסים אליך היום' : 'אין תורים היום'}
            </p>
            <HomeCTA
              canMutate={canMutate}
              onNewAppointment={openCreate}
              onCalendar={openCalendar}
            />
          </div>
        ) : (
          <HomeContent
            appointments={relevantAppointments}
            summary={relevantSummary}
            nextAppointment={nextAppointment}
            tz={tz}
            canMutate={canMutate}
            onSelect={setSelectedAppointment}
            onNewAppointment={openCreate}
            onCalendar={openCalendar}
          />
        )}
      </div>

      <CalendarBottomNav activeKey="home" />

      <CalendarAppointmentSheet
        appointment={selectedAppointment}
        timezone={tz}
        canMutate={canMutate}
        onStatusUpdate={handleStatusUpdate}
        onClosed={() => setSelectedAppointment(null)}
      />

      {canMutate && (
        <CalendarCreateSheet
          open={showCreateSheet}
          onClosed={() => setShowCreateSheet(false)}
          onCreated={() => { retry(); }}
          businessId={businessId}
          timezone={tz}
          initialDate={new Date()}
          services={services}
          serviceProviders={serviceProviders}
          currentBusinessUserId={currentUserId}
        />
      )}
    </div>
  );
}
