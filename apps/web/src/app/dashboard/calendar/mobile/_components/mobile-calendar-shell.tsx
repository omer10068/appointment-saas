'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { AppointmentStatus as ContractsStatus } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import { useMobileCalendarData } from '../_lib/useMobileCalendarData';
import { updateDashboardAppointmentStatus } from '../../../../../lib/api';
import { addDays, isSameDay } from '../_lib/calendar.utils';
import type { Appointment } from '../_lib/calendar.types';
import { CalendarHeader } from './calendar-header';
import { CalendarDayPicker } from './calendar-day-picker';
import { CalendarServiceProviderFilter } from './calendar-service-provider-filter';
import { CalendarTimeline } from './calendar-timeline';
import { MobileFab } from './mobile-fab';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { CalendarAppointmentSheet } from './calendar-appointment-sheet';
import { CalendarCreateSheet } from './calendar-create-sheet';
import { RescheduleAppointmentSheet } from './reschedule-appointment-sheet';

export function MobileCalendarShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusinessId, currentBusiness } = useDashboardBusiness();

  // Use the business's IANA timezone for all time display and timeline positioning.
  // Falls back to the browser's own timezone so behaviour is unchanged when the field is absent.
  const timezone =
    currentBusiness?.business.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // OWNER and MANAGER may mutate appointment status; MEMBER is read-only.
  // The backend is the authoritative RBAC check — this only controls UI visibility.
  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const [today] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [todayResetKey, setTodayResetKey] = useState(0);
  const [selectedServiceProviderId, setSelectedServiceProviderId] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  // ── Success banner ────────────────────────────────────────────────────────────
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function showSuccess(message: string) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessBanner(message);
    successTimerRef.current = setTimeout(() => setSuccessBanner(null), 3500);
  }

  const { serviceProviders, services, appointments, isLoading, error, refreshWeek } =
    useMobileCalendarData(currentBusinessId, selectedDate);

  // Auto-select the current user's own provider lane on first load.
  // Uses businessUserId (preserved from DTO) to match without name comparison.
  const autoFilterApplied = useRef(false);
  useEffect(() => {
    if (autoFilterApplied.current || serviceProviders.length === 0 || !currentBusiness) return;
    const myProvider = serviceProviders.find((sp) => sp.businessUserId === currentBusiness.id);
    if (myProvider) {
      setSelectedServiceProviderId(myProvider.id);
    }
    autoFilterApplied.current = true;
  }, [serviceProviders, currentBusiness]);

  // Current user's provider first, then the rest in original API order.
  // RTL renders the first item rightmost, so this also pins the user's lane to the right.
  const sortedServiceProviders = useMemo(() => {
    if (!currentBusiness) return serviceProviders;
    return [...serviceProviders].sort((a, b) => {
      if (a.businessUserId === currentBusiness.id) return -1;
      if (b.businessUserId === currentBusiness.id) return 1;
      return 0;
    });
  }, [serviceProviders, currentBusiness]);

  // All appointments for the selected day (used by the timeline)
  const allDayAppointments = useMemo(
    () => appointments.filter((a) => isSameDay(a.startTime, selectedDate)),
    [appointments, selectedDate],
  );

  // Countable appointments exclude cancelled statuses so filter pills reflect
  // active/actionable appointments only. COMPLETED and NO_SHOW are kept because
  // they represent real appointments that occurred (historical actuals).
  const countableDayAppointments = useMemo(
    () =>
      allDayAppointments.filter(
        (a) => a.status !== 'cancelled_by_business' && a.status !== 'cancelled_by_customer',
      ),
    [allDayAppointments],
  );

  const appointmentCountsByServiceProviderId = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        serviceProviders.map((sp) => [
          sp.id,
          countableDayAppointments.filter((a) => a.provider.id === sp.id).length,
        ]),
      ),
    [serviceProviders, countableDayAppointments],
  );

  // Pass the full week to the timeline so it can do its own day-filtering;
  // pre-filter by provider when one is selected (single-lane mode).
  const timelineAppointments = useMemo(
    () =>
      selectedServiceProviderId === 'all'
        ? appointments
        : appointments.filter((a) => a.provider.id === selectedServiceProviderId),
    [appointments, selectedServiceProviderId],
  );

  function handlePrevWeek() {
    setSelectedDate((d) => addDays(d, -7));
  }

  function handleNextWeek() {
    setSelectedDate((d) => addDays(d, 7));
  }

  function handleToday() {
    setSelectedDate(new Date());
    setTodayResetKey((k) => k + 1);
  }

  function handleNewAppointment() {
    setShowCreateSheet(true);
  }

  async function handleStatusUpdate(
    appointmentId: string,
    newStatus: ContractsStatus,
  ): Promise<void> {
    if (!currentBusinessId) return;
    await updateDashboardAppointmentStatus(
      currentBusinessId,
      appointmentId,
      { status: newStatus },
      () => getTokenRef.current(),
    );
    // Refresh only the appointments — providers/services are unaffected by a status change.
    refreshWeek();
  }

  function handleReschedule() {
    setRescheduleTarget(selectedAppointment);
  }

  return (
    // PHONE PREVIEW WRAPPER
    // Mobile  : fixed full-screen overlay (inset-0)
    // Desktop : centered narrow phone container (430 × 90dvh, rounded, shadow)
    //
    // The md: transform makes `fixed` children (bottom-nav, FAB, sheet) position
    // relative to this container on desktop, not the viewport — no extra work needed.
    //
    // Remove the md: classes when a proper desktop layout is designed.
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
      <CalendarHeader
        selectedDate={selectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
      />

      <CalendarDayPicker
        selectedDate={selectedDate}
        today={today}
        onSelect={setSelectedDate}
      />

      {/* ── Success banner (auto-dismisses after 3.5 s) ─────────────────── */}
      {successBanner && (
        <div className="flex-none flex items-center justify-center gap-2 bg-emerald-500 dark:bg-emerald-600 text-white text-[13px] font-semibold px-4 py-2.5">
          <span aria-hidden="true">✓</span>
          <span>{successBanner}</span>
        </div>
      )}

      {/* ── Content area ───────────────────────────────────────────────── */}

      {!currentBusinessId ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-gray-400 text-center">לא נבחר עסק</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <p className="text-sm text-gray-500 text-center">{error}</p>
          <button
            className="text-xs text-blue-600 underline"
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </button>
        </div>
      ) : isLoading && appointments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin" />
        </div>
      ) : (
        <>
          <CalendarServiceProviderFilter
            serviceProviders={sortedServiceProviders}
            selectedServiceProviderId={selectedServiceProviderId}
            onSelectServiceProvider={setSelectedServiceProviderId}
            appointmentCountsByServiceProviderId={appointmentCountsByServiceProviderId}
            totalAppointmentsCount={countableDayAppointments.length}
          />

          <CalendarTimeline
            key={todayResetKey}
            selectedDate={selectedDate}
            appointments={timelineAppointments}
            timezone={timezone}
            onSelectAppointment={setSelectedAppointment}
            serviceProviders={selectedServiceProviderId === 'all' ? sortedServiceProviders : undefined}
          />
        </>
      )}

      {canMutate && <MobileFab onClick={handleNewAppointment} />}
      <CalendarBottomNav activeKey="calendar" />

      <CalendarAppointmentSheet
        appointment={selectedAppointment}
        timezone={timezone}
        canMutate={canMutate}
        onStatusUpdate={handleStatusUpdate}
        onReschedule={canMutate ? handleReschedule : undefined}
        onClosed={() => setSelectedAppointment(null)}
      />

      <RescheduleAppointmentSheet
        appointment={rescheduleTarget}
        businessId={currentBusinessId}
        getToken={() => getTokenRef.current()}
        timezone={timezone}
        onSuccess={(newStartsAt) => {
          // Navigate to the week containing the rescheduled appointment.
          // If the new date is in the same week, setSelectedDate is a no-op for navigation
          // but useMobileCalendarData still refetches because refreshWeek() bumps its key.
          const newDate = new Date(newStartsAt);
          setSelectedDate(newDate);
          setSelectedAppointment(null);
          refreshWeek();
          showSuccess('התור עודכן בהצלחה');
        }}
        onClosed={() => setRescheduleTarget(null)}
      />

      <CalendarCreateSheet
        open={showCreateSheet}
        onClosed={() => setShowCreateSheet(false)}
        onCreated={(appointmentDate) => {
          // Navigate the main calendar to the week of the new appointment,
          // then refresh so it appears in the timeline immediately.
          setSelectedDate(appointmentDate);
          refreshWeek();
          showSuccess('התור נוסף בהצלחה');
        }}
        businessId={currentBusinessId}
        timezone={timezone}
        initialDate={selectedDate}
        services={services}
        serviceProviders={serviceProviders}
        currentBusinessUserId={currentBusiness?.id}
      />
    </div>
  );
}
