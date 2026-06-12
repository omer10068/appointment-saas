'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  fetchAvailableSlots,
  updateDashboardAppointment,
} from '@/lib/api';
import type { AvailableSlotItem } from '@/lib/api';
import { isFutureSlot, toLocalDateString } from './calendar.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Params {
  businessId: string | null;
  /** Pass '' when no appointment is loaded — hook guards on empty string. */
  serviceId: string;
  /** Pass '' when no appointment is loaded — hook guards on empty string. */
  serviceProviderId: string;
  timezone: string;
  getToken: () => Promise<string | null>;
}

export interface RescheduleFormState {
  selectedDate: Date;
  slots: AvailableSlotItem[];
  selectedSlot: AvailableSlotItem | null;
  isLoadingSlots: boolean;
  slotsError: string | null;
  isPastDate: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  isFormValid: boolean;
  selectDate: (date: Date) => void;
  selectSlot: (slot: AvailableSlotItem | null) => void;
  /** Returns the submitted startsAt ISO string on success, null on failure. */
  submit: (appointmentId: string) => Promise<string | null>;
  reset: (initialDate: Date) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRescheduleAppointmentForm({
  businessId,
  serviceId,
  serviceProviderId,
  timezone,
  getToken,
}: Params): RescheduleFormState {
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [selectedDate, setSelectedDate]     = useState<Date>(() => new Date());
  const [slots, setSlots]                   = useState<AvailableSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot]     = useState<AvailableSlotItem | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);

  const todayLocalDate    = toLocalDateString(new Date(), timezone);
  const selectedLocalDate = toLocalDateString(selectedDate, timezone);
  const isPastDate        = selectedLocalDate < todayLocalDate;

  useEffect(() => {
    if (!businessId || !serviceId || !serviceProviderId || isPastDate) {
      setSlots([]);
      setSlotsError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingSlots(true);
    setSlotsError(null);

    const dateStr = toLocalDateString(selectedDate, timezone);
    fetchAvailableSlots(
      businessId,
      { serviceId, serviceProviderId, date: dateStr },
      () => getTokenRef.current(),
    )
      .then((res) => { if (!cancelled) setSlots(res.slots.filter(isFutureSlot)); })
      .catch(() => {
        if (!cancelled) { setSlots([]); setSlotsError('שגיאה בטעינת זמנים פנויים'); }
      })
      .finally(() => { if (!cancelled) setIsLoadingSlots(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, serviceId, serviceProviderId, selectedDate.toDateString(), isPastDate]);

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
  }

  function selectSlot(slot: AvailableSlotItem | null) {
    setSelectedSlot(slot);
  }

  function reset(initialDate: Date) {
    const todayStr = toLocalDateString(new Date(), timezone);
    const dateStr  = toLocalDateString(initialDate, timezone);
    const clamped  = dateStr < todayStr ? new Date() : initialDate;
    setSelectedDate(clamped);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }

  async function submit(appointmentId: string): Promise<string | null> {
    if (!businessId || !selectedSlot) return null;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateDashboardAppointment(
        businessId,
        appointmentId,
        { startsAt: selectedSlot.startsAt },
        () => getTokenRef.current(),
      );
      return selectedSlot.startsAt;
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 409
          ? 'המועד כבר לא זמין, בחר מועד אחר'
          : 'שגיאה בשמירת המועד, נסה שוב',
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    selectedDate,
    slots,
    selectedSlot,
    isLoadingSlots,
    slotsError,
    isPastDate,
    isSubmitting,
    submitError,
    isFormValid: !isPastDate && !!selectedSlot,
    selectDate,
    selectSlot,
    submit,
    reset,
  };
}
