'use client';

import { useEffect, useRef } from 'react';
import type { Appointment } from '../_lib/calendar-v2.types';
import { TIMELINE, LAYOUT } from '../_lib/calendar-v2.design';
import { isSameDay } from '../_lib/calendar-v2.utils';
import { CalendarV2AppointmentCard } from './calendar-v2-appointment-card';
import { CalendarV2EmptyState } from './calendar-v2-empty-state';

interface Props {
  selectedDate: Date;
  appointments: Appointment[];
  onEditAppointment?: (id: string) => void;
}

const HOURS = Array.from(
  { length: TIMELINE.endHour - TIMELINE.startHour },
  (_, i) => TIMELINE.startHour + i,
);

export function CalendarV2Timeline({ selectedDate, appointments, onEditAppointment }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayAppointments = appointments.filter((a) => isSameDay(a.startTime, selectedDate));

  // Scroll to current hour (or day start) whenever the selected date changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const targetHour = isToday
      ? Math.max(TIMELINE.startHour, Math.min(now.getHours() - 1, TIMELINE.endHour - 2))
      : TIMELINE.startHour;
    scrollRef.current.scrollTop = (targetHour - TIMELINE.startHour) * TIMELINE.slotHeightPx;
  }, [selectedDate]);

  if (dayAppointments.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <CalendarV2EmptyState />
      </div>
    );
  }

  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const nowOffsetPx = isToday
    ? Math.round(
        (now.getHours() - TIMELINE.startHour + now.getMinutes() / 60) * TIMELINE.slotHeightPx,
      )
    : -1;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 72 }}
    >
      <div className="relative">
        {/* Current time indicator */}
        {nowOffsetPx >= 0 && (
          <div
            className="absolute inset-x-0 z-10 pointer-events-none"
            style={{ top: nowOffsetPx }}
          >
            <div className="border-t border-red-400 mx-14" />
          </div>
        )}

        {HOURS.map((hour) => {
          const hourAppts = dayAppointments.filter((a) => a.startTime.getHours() === hour);

          return (
            <div
              key={hour}
              className="flex border-b border-gray-100 dark:border-gray-800"
              style={{ minHeight: TIMELINE.slotHeightPx }}
            >
              {/* Time label — first child = rightmost in RTL */}
              <div className="w-14 flex-shrink-0 flex items-start justify-center pt-3 border-l border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 font-medium tabular-nums">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>

              {/* Appointments area */}
              <div className="flex-1 px-3 pt-2">
                {hourAppts.map((appt) => (
                  <CalendarV2AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onEdit={onEditAppointment}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
