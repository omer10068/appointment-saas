'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import type { AppointmentStatus as ContractsStatus } from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import { useMobileCalendarData } from '../_lib/useMobileCalendarData';
import { useAppBusinessHours } from '../_hooks/useAppBusinessHours';
import { useAppServiceProviderHours } from '../_hooks/useAppServiceProviderHours';
import { updateDashboardAppointmentStatus } from '@/lib/api';
import { appKeys } from '../_lib/query-keys';
import { addDays, formatMonthYear, isSameDay, startOfWeek } from '../_lib/calendar.utils';
import { CalendarMonthPicker } from './calendar-month-picker';
import type { Appointment } from '../_lib/calendar.types';
import { CalendarHeader } from './calendar-header';
import { CalendarDayPicker } from './calendar-day-picker';
import { CalendarTimeline } from './calendar-timeline';
import { MobileFab } from './mobile-fab';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { CalendarAppointmentSheet } from './calendar-appointment-sheet';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { MobileToast } from './mobile-toast';
import { useMobileToast } from '../_lib/useMobileToast';
import { CalendarCreateSheet } from './calendar-create-sheet';
import { RescheduleAppointmentSheet } from './reschedule-appointment-sheet';
import { CalendarProviderFilterSheet } from './calendar-provider-filter-sheet';
import { MobilePageHeader } from './mobile-page-header';

export function MobileCalendarShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusinessId, currentBusiness } = useBusiness();
  const businessName = currentBusiness?.business.name;

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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showProviderFilter, setShowProviderFilter] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const { message: toastMessage, showToast } = useMobileToast();

  const queryClient = useQueryClient();

  function invalidateAppointments() {
    if (!currentBusinessId) return;
    void queryClient.invalidateQueries({ queryKey: appKeys.todayAppointments(currentBusinessId) });
    void queryClient.invalidateQueries({ queryKey: appKeys.weekAppointmentsAll(currentBusinessId) });
  }

  const { serviceProviders, services, appointments, isLoading, error } =
    useMobileCalendarData(currentBusinessId, selectedDate);

  // Business working hours — used as the timeline range anchor in all-team mode.
  // Errors are silently ignored: the timeline falls back to appointment-derived range.
  const allBusinessHours = useAppBusinessHours(currentBusinessId);
  const businessWorkingHours = allBusinessHours
    .filter((h) => !h.isClosed && h.startTime && h.endTime)
    .map((h) => ({ startTime: h.startTime!, endTime: h.endTime! }));

  // Provider selection — two-variable pattern avoids a useEffect-driven jump:
  //   manualProviderId  — null until the user explicitly taps a filter chip.
  //   defaultProviderId — derived synchronously from loaded providers so the first
  //                       visible calendar render already uses the correct lane.
  const [manualProviderId, setManualProviderId] = useState<string | null>(null);

  const defaultProviderId = useMemo(() => {
    if (!currentBusiness || serviceProviders.length === 0) return 'all';
    const myProvider = serviceProviders.find((sp) => sp.businessUserId === currentBusiness.id);
    return myProvider?.id ?? 'all';
  }, [serviceProviders, currentBusiness]);

  const selectedServiceProviderId = manualProviderId ?? defaultProviderId;

  // Provider working hours — used as the timeline range anchor in single-provider mode.
  // Only fetched when a specific provider is selected. Errors are silently ignored.
  const isSingleProvider = selectedServiceProviderId !== 'all';
  // Pass null when in all-team mode so the hook's `enabled` guard skips the fetch.
  const selectedProviderId = isSingleProvider ? selectedServiceProviderId : null;
  const allProviderHours = useAppServiceProviderHours(currentBusinessId, selectedProviderId);
  const providerWorkingHours = allProviderHours
    .filter((h) => !h.isClosed && h.startTime && h.endTime)
    .map((h) => ({ startTime: h.startTime!, endTime: h.endTime! }));

  // In all-team mode: anchor to business hours (covers the full team window).
  // In single-provider mode: anchor to that provider's hours (narrower, more precise).
  // Fall back to business hours if provider hours are not yet loaded.
  const timelineAnchorHours =
    isSingleProvider && providerWorkingHours.length > 0
      ? providerWorkingHours
      : businessWorkingHours;

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

  const canFilterProviders = sortedServiceProviders.length > 1;

  const filterLabel = (() => {
    if (sortedServiceProviders.length === 1) {
      return sortedServiceProviders[0]?.name.split(' ')[0] ?? 'כל הצוות';
    }
    if (selectedServiceProviderId === 'all') return 'כל הצוות';
    return sortedServiceProviders.find((sp) => sp.id === selectedServiceProviderId)?.name.split(' ')[0] ?? 'כל הצוות';
  })();

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
    setSelectedDate((d) => startOfWeek(addDays(d, -7)));
  }

  function handleNextWeek() {
    setSelectedDate((d) => startOfWeek(addDays(d, 7)));
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
    invalidateAppointments();
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
    <MobilePhoneFrame dir="rtl">
      {/* Page header */}
      <MobilePageHeader
        title="יומן"
        icon={Calendar}
        subtitle={businessName}
        meta={formatMonthYear(selectedDate)}
        className="flex-none border-b border-border bg-card px-5 pt-9 pb-5"
      />

      {/* Week strip: nav row + day picker share one card section */}
      <div className="flex-none bg-card px-0 pb-1 pt-2">
        <CalendarHeader
          selectedDate={selectedDate}
          onToday={handleToday}
          onOpenCalendar={() => setShowMonthPicker(true)}
          onFilterPress={() => setShowProviderFilter(true)}
          filterLabel={filterLabel}
          canFilter={canFilterProviders}
        />
        <CalendarDayPicker
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
        />
      </div>

      <MobileToast message={toastMessage} />

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
          <CalendarTimeline
            key={todayResetKey}
            selectedDate={selectedDate}
            appointments={timelineAppointments}
            timezone={timezone}
            onSelectAppointment={setSelectedAppointment}
            serviceProviders={
              selectedServiceProviderId === 'all'
                ? sortedServiceProviders
                : sortedServiceProviders.filter((sp) => sp.id === selectedServiceProviderId)
            }
            businessWorkingHours={timelineAnchorHours}
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

      <CalendarMonthPicker
        open={showMonthPicker}
        selectedDate={selectedDate}
        timezone={timezone}
        appointmentDates={appointments.map((a) => a.startTime)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setTodayResetKey((k) => k + 1);
        }}
        onClosed={() => setShowMonthPicker(false)}
      />

      <RescheduleAppointmentSheet
        appointment={rescheduleTarget}
        businessId={currentBusinessId}
        getToken={() => getTokenRef.current()}
        timezone={timezone}
        onSuccess={(newStartsAt) => {
          // Navigate to the week containing the rescheduled appointment.
          const newDate = new Date(newStartsAt);
          setSelectedDate(newDate);
          setSelectedAppointment(null);
          invalidateAppointments();
          showToast('התור עודכן בהצלחה');
        }}
        onClosed={() => setRescheduleTarget(null)}
      />

      <CalendarCreateSheet
        open={showCreateSheet}
        onClosed={() => setShowCreateSheet(false)}
        onCreated={(appointmentDate) => {
          // Navigate the main calendar to the week of the new appointment.
          setSelectedDate(appointmentDate);
          invalidateAppointments();
          showToast('התור נוסף בהצלחה');
        }}
        businessId={currentBusinessId}
        timezone={timezone}
        initialDate={selectedDate}
        services={services}
        serviceProviders={serviceProviders}
        currentBusinessUserId={currentBusiness?.id}
      />

      <CalendarProviderFilterSheet
        open={showProviderFilter}
        serviceProviders={sortedServiceProviders}
        selectedServiceProviderId={selectedServiceProviderId}
        appointmentCountsByServiceProviderId={appointmentCountsByServiceProviderId}
        totalAppointmentsCount={countableDayAppointments.length}
        onSelect={(id) => setManualProviderId(id)}
        onClosed={() => setShowProviderFilter(false)}
      />
    </MobilePhoneFrame>
  );
}
