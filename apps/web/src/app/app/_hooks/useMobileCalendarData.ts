'use client';

import { useMemo } from 'react';
import { useAppServiceProviders } from './useAppServiceProviders';
import { useAppServices } from './useAppServices';
import { useWeekAppointments } from './useWeekAppointments';
import {
  buildServiceMap,
  mapDtoToAppointment,
  mapDtoToService,
  mapDtoToServiceProvider,
} from '../_lib/calendar.mappers';
import { startOfWeek } from '../_lib/calendar.utils';
import type { Appointment, Service, ServiceProvider } from '../_lib/calendar.types';

export interface MobileCalendarData {
  serviceProviders: ServiceProvider[];
  /** Active services for this business. Used by the create-appointment form. */
  services: Service[];
  /** All appointments for the visible week, mapped to UI types. */
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  /** Re-fetches only the current week's appointments. Does not reload providers/services. */
  refreshWeek: () => void;
}

export function useMobileCalendarData(
  businessId: string | null,
  selectedDate: Date,
): MobileCalendarData {
  // Derive a stable ISO string from selectedDate that only changes when the week
  // boundary is crossed. startOfWeek returns local midnight on Sunday; toISOString()
  // converts to a UTC string that TanStack Query uses as a stable cache key.
  const weekStartISO = startOfWeek(selectedDate).toISOString();

  // Service providers — shared TanStack cache with other tabs (5-min staleTime).
  // Returns ALL providers; active filter applied below.
  const {
    providers: allProviders,
    loading: providersLoading,
    error: providersError,
  } = useAppServiceProviders(businessId);

  // Services — shared TanStack cache (5-min staleTime).
  // Returns ALL services (active + inactive); active filter applied below.
  // The full set is kept so the service map can resolve historical appointment names.
  const {
    services: allServiceDtos,
    loading: servicesLoading,
    error: servicesError,
  } = useAppServices(businessId);

  // Weekly appointments — staleTime: 0 so each week navigation fetches fresh data.
  // Returns raw DTOs; mapping to UI types is done below via useMemo.
  const {
    rawAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useWeekAppointments(businessId, weekStartISO);

  // Active-only providers for the timeline filter chips and create-appointment form.
  const serviceProviders: ServiceProvider[] = useMemo(
    () => allProviders.filter((dto) => dto.isActive).map(mapDtoToServiceProvider),
    [allProviders],
  );

  // Active-only services exposed to the create-appointment form.
  const services: Service[] = useMemo(
    () => allServiceDtos.filter((dto) => dto.isActive).map(mapDtoToService),
    [allServiceDtos],
  );

  // Full service map built from ALL services (active + inactive).
  // Inactive services must remain in the map so historical appointments that
  // reference them still render the correct service name.
  // mapDtoToAppointment also has a dto.serviceName fallback for services that
  // have been deleted from the DB entirely.
  const serviceMap = useMemo(
    () => buildServiceMap(allServiceDtos.map(mapDtoToService)),
    [allServiceDtos],
  );

  // Map raw appointment DTOs to UI Appointment objects.
  const appointments: Appointment[] = useMemo(
    () => rawAppointments.map((dto) => mapDtoToAppointment(dto, serviceMap)),
    [rawAppointments, serviceMap],
  );

  return {
    serviceProviders,
    services,
    appointments,
    // isLoading uses TanStack's initial-load semantics: true only when there is
    // no cached data AND the query is fetching. Background refetches (isFetching
    // with stale cache) do not flip this flag, avoiding a full-page loading flash
    // when navigating back to a previously-visited week.
    isLoading: providersLoading || servicesLoading || appointmentsLoading,
    error: providersError ?? servicesError ?? appointmentsError,
    // Compatibility alias — callers (status update, reschedule, create) call
    // refreshWeek() after mutations to re-fetch the current week's appointments.
    refreshWeek: refetchAppointments,
  };
}
