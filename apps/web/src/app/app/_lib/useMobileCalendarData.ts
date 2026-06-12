'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { DashboardAppointmentDto } from '@appointment/contracts';
import {
  fetchDashboardAppointments,
  fetchDashboardServiceProviders,
  fetchDashboardServices,
} from '@/lib/api';
import {
  buildServiceMap,
  mapDtoToAppointment,
  mapDtoToService,
  mapDtoToServiceProvider,
} from './calendar.mappers';
import { startOfWeek } from './calendar.utils';
import type { Appointment, Service, ServiceProvider } from './calendar.types';

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
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceMap, setServiceMap] = useState<Map<string, Service>>(new Map());
  const [weekDtos, setWeekDtos] = useState<DashboardAppointmentDto[]>([]);
  const [isLoadingStatic, setIsLoadingStatic] = useState(false);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekRefreshKey, setWeekRefreshKey] = useState(0);

  // Stable week-start state — only updates when selectedDate crosses a week boundary.
  // Using state (not useMemo) ensures a stable object reference for the effect dep.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  useEffect(() => {
    const next = startOfWeek(selectedDate);
    setWeekStart((prev) =>
      prev.toDateString() === next.toDateString() ? prev : next,
    );
  }, [selectedDate]);

  // Fetch service providers + services once per business (relatively static data)
  useEffect(() => {
    if (!businessId) {
      setServiceProviders([]);
      setServiceMap(new Map());
      return;
    }

    let cancelled = false;
    setIsLoadingStatic(true);
    setError(null);

    Promise.all([
      fetchDashboardServiceProviders(businessId, () => getTokenRef.current()),
      fetchDashboardServices(businessId, () => getTokenRef.current()),
    ])
      .then(([providerDtos, serviceDtos]) => {
        if (cancelled) return;
        const allServices = serviceDtos.map(mapDtoToService);
        // Active services exposed for the create-appointment form.
        // The full map (including inactive) is kept for mapping historical appointments.
        setServices(serviceDtos.filter((dto) => dto.isActive).map(mapDtoToService));
        setServiceProviders(providerDtos.filter((dto) => dto.isActive).map(mapDtoToServiceProvider));
        setServiceMap(buildServiceMap(allServices));
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת הנתונים');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatic(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // Fetch appointments for the visible week (re-fetches on week navigation)
  useEffect(() => {
    if (!businessId) {
      setWeekDtos([]);
      return;
    }

    let cancelled = false;
    setIsLoadingWeek(true);

    const from = weekStart;
    const to = new Date(weekStart);
    to.setDate(weekStart.getDate() + 6);
    to.setHours(23, 59, 59, 999);

    fetchDashboardAppointments(businessId, () => getTokenRef.current(), {
      from: from.toISOString(),
      to: to.toISOString(),
    })
      .then((dtos) => {
        if (!cancelled) setWeekDtos(dtos);
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת הנתונים');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWeek(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, weekStart, weekRefreshKey]);

  const appointments = useMemo(
    () => weekDtos.map((dto) => mapDtoToAppointment(dto, serviceMap)),
    [weekDtos, serviceMap],
  );

  return {
    serviceProviders,
    services,
    appointments,
    isLoading: isLoadingStatic || isLoadingWeek,
    error,
    refreshWeek: () => setWeekRefreshKey((k) => k + 1),
  };
}
