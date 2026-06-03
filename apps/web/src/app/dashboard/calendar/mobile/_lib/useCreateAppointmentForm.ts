'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { DashboardCustomerDto } from '@appointment/contracts';
import { CustomerStatus } from '@appointment/contracts';
import {
  createDashboardAppointment,
  fetchAvailableSlots,
  fetchDashboardCustomers,
} from '../../../../../lib/api';
import type { AvailableSlotItem } from '../../../../../lib/api';
import { toLocalDateString } from './calendar.utils';
import type { ServiceProvider } from './calendar.types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type { AvailableSlotItem };

export interface CreateAppointmentFormState {
  // ── Selections ──────────────────────────────────────────────────────────────
  selectedServiceId: string | null;
  selectedProviderId: string | null;
  selectedDate: Date;
  selectedSlot: AvailableSlotItem | null;
  selectedCustomerId: string | null;

  // ── Derived data ────────────────────────────────────────────────────────────
  /** Active providers that offer the currently selected service. Empty until a service is chosen. */
  bookableProviders: ServiceProvider[];

  // ── Date guard ───────────────────────────────────────────────────────────────
  /** True when selectedDate is before business-today. Blocks slot fetch and submit. */
  isPastDate: boolean;

  // ── Customer data ────────────────────────────────────────────────────────────
  customers: DashboardCustomerDto[];
  isLoadingCustomers: boolean;

  // ── Slot data ────────────────────────────────────────────────────────────────
  slots: AvailableSlotItem[];
  isLoadingSlots: boolean;
  slotsError: string | null;

  // ── Form validity ────────────────────────────────────────────────────────────
  isFormValid: boolean;

  // ── Submit state ─────────────────────────────────────────────────────────────
  isSubmitting: boolean;
  submitError: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  selectService: (id: string | null) => void;
  selectProvider: (id: string | null) => void;
  selectDate: (date: Date) => void;
  selectSlot: (slot: AvailableSlotItem | null) => void;
  selectCustomer: (id: string | null) => void;
  /**
   * Full form reset: clears all selections, clamps date to business-today if past.
   * Call when the sheet opens so every opening starts fresh.
   */
  resetForm: (initialDate: Date) => void;
  /** Creates the appointment. Returns true on success, false on failure. */
  submit: () => Promise<boolean>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateAppointmentForm(params: {
  businessId: string | null;
  timezone: string;
  initialDate: Date;
  serviceProviders: ServiceProvider[];
  /** currentBusiness.id (BusinessUser record ID) used to auto-select the user's own provider. */
  currentBusinessUserId?: string;
}): CreateAppointmentFormState {
  const { businessId, timezone, initialDate, serviceProviders, currentBusinessUserId } = params;

  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // ── Form selections ──────────────────────────────────────────────────────────
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // ── Customer data ────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<DashboardCustomerDto[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // ── Slot data ─────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<AvailableSlotItem[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // ── Submit state ─────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Derived: today and past-date guard ───────────────────────────────────────
  // Computed each render so it stays accurate across midnight without extra state.
  const todayLocalDate = toLocalDateString(new Date(), timezone);
  const selectedLocalDate = toLocalDateString(selectedDate, timezone);
  const isPastDate = selectedLocalDate < todayLocalDate;

  // ── Derived: bookable providers ───────────────────────────────────────────────
  const bookableProviders = useMemo(() => {
    if (!selectedServiceId) return [];
    return serviceProviders.filter(
      (sp) =>
        sp.isActive !== false &&
        (sp.serviceIds?.includes(selectedServiceId) ?? true),
    );
  }, [serviceProviders, selectedServiceId]);

  // ── Fetch customers once on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) {
      setCustomers([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCustomers(true);

    fetchDashboardCustomers(businessId, () => getTokenRef.current())
      .then((dtos) => {
        if (cancelled) return;
        setCustomers(dtos.filter((c) => c.status === CustomerStatus.ACTIVE));
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCustomers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // ── Fetch available slots when all upstream selections are ready ──────────────
  useEffect(() => {
    if (!businessId || !selectedServiceId || !selectedProviderId || isPastDate) {
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
      { serviceId: selectedServiceId, serviceProviderId: selectedProviderId, date: dateStr },
      () => getTokenRef.current(),
    )
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setSlotsError('שגיאה בטעינת זמנים פנויים');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
    // selectedDate is a Date — use its string representation as the stable dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, selectedServiceId, selectedProviderId, selectedDate.toDateString(), isPastDate]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  function selectService(id: string | null) {
    setSelectedServiceId(id);
    setSelectedSlot(null);
    setSlots([]);

    // Reset provider on service change, then auto-select the user's own provider
    // if they offer the new service (mirrors the timeline lane filter logic).
    setSelectedProviderId(null);
    if (id && currentBusinessUserId) {
      const mine = serviceProviders.find(
        (sp) =>
          sp.isActive !== false &&
          sp.businessUserId === currentBusinessUserId &&
          (sp.serviceIds?.includes(id) ?? false),
      );
      if (mine) setSelectedProviderId(mine.id);
    }
  }

  function selectProvider(id: string | null) {
    setSelectedProviderId(id);
    setSelectedSlot(null);
    setSlots([]);
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
  }

  function selectSlot(slot: AvailableSlotItem | null) {
    setSelectedSlot(slot);
  }

  function selectCustomer(id: string | null) {
    setSelectedCustomerId(id);
  }

  function resetForm(date: Date) {
    const todayStr = toLocalDateString(new Date(), timezone);
    const dateStr = toLocalDateString(date, timezone);
    const clamped = dateStr < todayStr ? new Date() : date;
    setSelectedServiceId(null);
    setSelectedProviderId(null);
    setSelectedDate(clamped);
    setSelectedSlot(null);
    setSelectedCustomerId(null);
    setSlots([]);
    setSlotsError(null);
    setSubmitError(null);
  }

  async function submit(): Promise<boolean> {
    if (!businessId || !selectedServiceId || !selectedProviderId || !selectedSlot || !selectedCustomerId) {
      return false;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createDashboardAppointment(
        businessId,
        {
          businessCustomerId: selectedCustomerId,
          serviceId: selectedServiceId,
          serviceProviderId: selectedProviderId,
          startsAt: selectedSlot.startsAt,
        },
        () => getTokenRef.current(),
      );
      return true;
    } catch {
      setSubmitError('שגיאה ביצירת התור, נסה שוב');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormValid =
    !isPastDate &&
    !!selectedServiceId &&
    !!selectedProviderId &&
    !!selectedSlot &&
    !!selectedCustomerId;

  return {
    selectedServiceId,
    selectedProviderId,
    selectedDate,
    selectedSlot,
    selectedCustomerId,
    bookableProviders,
    isPastDate,
    customers,
    isLoadingCustomers,
    slots,
    isLoadingSlots,
    slotsError,
    isFormValid,
    isSubmitting,
    submitError,
    selectService,
    selectProvider,
    selectDate,
    selectSlot,
    selectCustomer,
    resetForm,
    submit,
  };
}
