'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Clock3, ChevronLeft, Plus } from 'lucide-react';
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
import { SERVICE_COLORS } from '../_lib/calendar.design';
import type {
  Appointment,
  AppointmentStatus,
  Service,
  ServiceProvider,
} from '../_lib/calendar.types';

// ─── Status badge config (dot-indicator style matching v0) ────────────────────

interface BadgeCfg { bg: string; text: string; dot: string; label: string }

const STATUS_BADGE: Record<AppointmentStatus, BadgeCfg> = {
  scheduled:             { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500',   label: 'מתוכנן'  },
  confirmed:             { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'מאושר'   },
  completed:             { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'הושלם'   },
  cancelled_by_customer: { bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400',   label: 'בוטל'    },
  cancelled_by_business: { bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400',   label: 'בוטל'    },
  no_show:               { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'לא הגיע' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YUVAL-TURGEMAN" → "Yuval Turgeman", "my salon" → "My Salon" */
function toFriendlyName(raw: string): string {
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function getFirstWord(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

function getInitials(friendly: string): string {
  return friendly
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function SummaryCard({ label, value, highlight }: SummaryCardProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-2 py-4 shadow-sm shadow-[#1a2035]/5 dark:border-gray-700 dark:bg-gray-800">
      <span
        className={`text-2xl font-extrabold tabular-nums ${
          highlight ? 'text-teal-600 dark:text-teal-400' : 'text-[#1a2035] dark:text-gray-100'
        }`}
      >
        {value}
      </span>
      <span className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight">
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
  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-3xl bg-[#1a2035] p-6 text-right shadow-xl shadow-[#1a2035]/20 transition active:scale-[0.98]"
    >
      {/* Teal glow — matches v0 physical position (top-left) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-teal-500/25 blur-2xl"
      />

      <div className="relative">
        {/* Badge row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
            <Clock3 className="size-3.5" aria-hidden="true" />
            התור הבא
          </span>
        </div>

        {/* Service + customer (RTL start/right) / big time (RTL end/left) */}
        <div className="mt-4 flex items-end justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold leading-tight text-white">
              {appointment.service.name}
            </p>
            <p className="mt-1 truncate text-sm text-white/70">
              {appointment.customer.name}
            </p>
          </div>
          <span
            className="shrink-0 text-5xl font-extrabold tabular-nums leading-none text-white"
            dir="ltr"
          >
            {formatTime(appointment.startTime, tz)}
          </span>
        </div>

        {/* CTA — styled as button but inside a <button>, so use <div> */}
        <div className="mt-5 flex w-full items-center justify-center gap-1 rounded-2xl bg-teal-600 py-3 text-sm font-bold text-white">
          צפייה בפרטי התור
          <ChevronLeft className="size-4" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}

// ─── No-next-appointment card ─────────────────────────────────────────────────
// Calm, light card — reserved for when all today's appointments are past.

function NoNextCard() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm shadow-[#1a2035]/5 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
        אין עוד תורים להמשך היום
      </p>
      <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
        כל התורים הבאים הסתיימו
      </p>
    </div>
  );
}

// ─── Appointment list row ─────────────────────────────────────────────────────

interface RowProps {
  appointment: Appointment;
  tz: string;
  onClick: () => void;
}

function AppointmentRow({ appointment, tz, onClick }: RowProps) {
  const c    = SERVICE_COLORS[appointment.service.color];
  const b    = STATUS_BADGE[appointment.status];
  const isCancelled =
    appointment.status === 'cancelled_by_customer' ||
    appointment.status === 'cancelled_by_business';

  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-4',
        'rounded-2xl border border-gray-200 bg-white p-3.5',
        'shadow-sm shadow-[#1a2035]/5',
        'text-right transition active:scale-[0.98]',
        'dark:border-gray-700 dark:bg-gray-800',
        isCancelled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Time — rightmost in RTL, separated by left border */}
      <div className="flex shrink-0 flex-col items-center">
        <span
          className="text-base font-extrabold tabular-nums text-[#1a2035] dark:text-gray-100"
          dir="ltr"
        >
          {formatTime(appointment.startTime, tz)}
        </span>
      </div>

      {/* Colored service bar */}
      <div className={`w-1 self-stretch rounded-full ${c.bar} shrink-0`} />

      {/* Service + customer */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            'text-sm font-bold text-[#1a2035] truncate leading-tight dark:text-gray-100',
            isCancelled ? 'line-through decoration-gray-400/50' : '',
          ].join(' ')}
        >
          {appointment.service.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {appointment.customer.name}
        </p>
      </div>

      {/* Status badge with dot — leftmost in RTL */}
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${b.bg} ${b.text}`}
      >
        <span className={`size-1.5 rounded-full ${b.dot}`} />
        {b.label}
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-2 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="h-7 w-8 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-1 h-3 w-14 rounded bg-gray-100 dark:bg-gray-700" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="h-44 rounded-3xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="h-5 w-10 shrink-0 rounded border-l border-gray-200 pl-4 dark:border-gray-700">
              <div className="h-5 w-10 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-8 w-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
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
  onSelect: (a: Appointment) => void;
}

function HomeContent({ appointments, summary, nextAppointment, tz, onSelect }: ContentProps) {
  return (
    <div className="space-y-5">
      {/* Stat cards — grid matches v0 */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="הושלמו"       value={summary.completedToday} highlight />
        <SummaryCard label="נותרו היום"   value={summary.remainingToday} />
        <SummaryCard label='סה״כ תורים'  value={summary.totalToday} />
      </div>

      {/* Next appointment hero or empty-state hero — always a dark card */}
      {nextAppointment ? (
        <NextAppointmentCard
          appointment={nextAppointment}
          tz={tz}
          onClick={() => onSelect(nextAppointment)}
        />
      ) : (
        <NoNextCard />
      )}

      {/* Today's full list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a2035] dark:text-gray-100">
            כל התורים היום
          </h2>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {appointments.length} תורים
          </span>
        </div>
        <div className="space-y-2.5">
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

const CANCELLED_STATUS = new Set<AppointmentStatus>(['cancelled_by_customer', 'cancelled_by_business']);
const ACTIVE_STATUS    = new Set<AppointmentStatus>(['scheduled', 'confirmed']);

export function MobileHomeShell() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useDashboardBusiness();
  const businessName  = currentBusiness?.business.name;
  const businessId    = currentBusiness?.business.id ?? null;
  const timezone      = currentBusiness?.business.timezone;
  const currentUserId = currentBusiness?.id;
  const canMutate     = currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  // ── Service providers + services ─────────────────────────────────────────────

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [services, setServices]                 = useState<Service[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  useEffect(() => {
    if (!businessId) { setServiceProviders([]); setServices([]); return; }
    let cancelled = false;
    setProvidersLoading(true);
    Promise.all([
      fetchDashboardServiceProviders(businessId, () => getTokenRef.current()),
      fetchDashboardServices(businessId, () => getTokenRef.current()),
    ])
      .then(([providerDtos, serviceDtos]) => {
        if (cancelled) return;
        setServiceProviders(providerDtos.map(mapDtoToServiceProvider));
        setServices(serviceDtos.filter(d => d.isActive).map(mapDtoToService));
      })
      .catch(() => { /* Graceful degradation */ })
      .finally(() => { if (!cancelled) setProvidersLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Today's appointments ──────────────────────────────────────────────────────

  const { appointments, loading, error, retry } = useTodayAppointments(businessId, timezone);

  // ── Provider-based personal filtering ────────────────────────────────────────
  //
  // Home is a personal view: show appointments for the current user's linked
  // ServiceProvider (matched via BusinessUser.id → ServiceProvider.businessUserId).
  // OWNER/MANAGER without a linked provider see all; MEMBER sees nothing.

  const myProvider = serviceProviders.find(sp => sp.businessUserId === currentUserId);

  let relevantAppointments: Appointment[];
  if (myProvider)       relevantAppointments = appointments.filter(a => a.provider.id === myProvider.id);
  else if (canMutate)   relevantAppointments = appointments;
  else                  relevantAppointments = [];

  const now = new Date();

  const relevantSummary: TodaySummary = {
    totalToday:     relevantAppointments.filter(a => !CANCELLED_STATUS.has(a.status)).length,
    remainingToday: relevantAppointments.filter(a => ACTIVE_STATUS.has(a.status) && a.startTime > now).length,
    completedToday: relevantAppointments.filter(a => a.status === 'completed').length,
  };

  const nextAppointment = relevantAppointments.find(
    a => ACTIVE_STATUS.has(a.status) && a.startTime > now,
  );

  // ── Sheet state ───────────────────────────────────────────────────────────────

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateSheet, setShowCreateSheet]         = useState(false);

  const tz           = timezone ?? 'UTC';
  const todayLabel   = formatDate(new Date(), tz);
  const friendlyName = businessName ? toFriendlyName(businessName) : '';
  const greetingName = friendlyName ? getFirstWord(friendlyName) : '';
  const initials     = friendlyName ? getInitials(friendlyName) : '?';
  const isLoading    = loading || providersLoading;
  const memberWithNoProvider = !canMutate && !myProvider;

  function openCreate()   { setShowCreateSheet(true); }
  function openCalendar() { router.push('/mobile/calendar'); }

  async function handleStatusUpdate(appointmentId: string, newStatus: ContractsStatus): Promise<void> {
    if (!businessId) return;
    await updateDashboardAppointmentStatus(
      businessId, appointmentId, { status: newStatus }, () => getTokenRef.current(),
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
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-none px-5 pt-9 pb-5">
        <div className="flex items-start justify-between">
          {/* Left side (RTL start = physical right): greeting + title + date */}
          <div>
            <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
              {greetingName ? `שלום, ${greetingName}` : 'שלום'}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1a2035] dark:text-gray-100">
              דף הבית
            </h1>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {todayLabel}
            </p>
          </div>

          {/* Right side (RTL end = physical left): initials avatar */}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-500/20 dark:bg-teal-900/30 dark:text-teal-300">
            {initials}
          </div>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={retry}
              className="text-sm font-medium text-teal-600 dark:text-teal-400"
            >
              נסה שוב
            </button>
          </div>
        ) : relevantAppointments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
              {memberWithNoProvider ? 'אין תורים מיוחסים אליך היום' : 'אין תורים היום'}
            </p>
            {!canMutate && (
              <button
                onClick={openCalendar}
                className="rounded-2xl bg-[#1a2035] px-5 py-2.5 text-sm font-bold text-white transition active:opacity-75 dark:bg-gray-800"
              >
                פתח יומן
              </button>
            )}
          </div>
        ) : (
          <HomeContent
            appointments={relevantAppointments}
            summary={relevantSummary}
            nextAppointment={nextAppointment}
            tz={tz}
            onSelect={setSelectedAppointment}
          />
        )}
      </div>

      {/* ── Floating + button (OWNER / MANAGER only) ────────────────────── */}
      {canMutate && (
        <button
          onClick={openCreate}
          aria-label="קביעת תור חדש"
          className="fixed bottom-28 left-5 z-30 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/40 transition active:scale-[0.98]"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}

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
