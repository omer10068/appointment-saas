'use client';

import { useEffect, useRef } from 'react';
import type { Appointment } from '../_lib/calendar-v2.types';
import { TIMELINE, LAYOUT } from '../_lib/calendar-v2.design';
import { isSameDay, formatTime } from '../_lib/calendar-v2.utils';
import { CalendarV2AppointmentCard } from './calendar-v2-appointment-card';
import { CalendarV2EmptyState } from './calendar-v2-empty-state';

interface Props {
  selectedDate: Date;
  appointments: Appointment[];
  onEditAppointment?: (id: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Dedicated right-side time-label column width.
// This value is the single source of truth for both the label layer
// and the main timeline layer.
const TIME_LABEL_WIDTH = 56;

// Gap between appointment cards and the edges of the main timeline area.
const APPT_INSET_PX = 8;

// Current-time indicator tuning.
const NOW_LINE_OVERHANG_PX = 14;
const NOW_ICON_SIZE_PX = 16;
const NOW_ICON_RIGHT_PX = -(TIME_LABEL_WIDTH / 2 + NOW_ICON_SIZE_PX / 2);

const MINUTE_HEIGHT = TIMELINE.slotHeightPx / 60;
const TIMELINE_START_MIN = TIMELINE.startHour * 60;
const TIMELINE_END_MIN = TIMELINE.endHour * 60;
const TOTAL_HEIGHT_PX = (TIMELINE.endHour - TIMELINE.startHour) * TIMELINE.slotHeightPx;
const HALF_SLOT_PX = TIMELINE.slotHeightPx / 2;

// Every 30-minute mark from startHour to endHour, inclusive.
// Hour marks are solid; half-hour marks are dashed and labeled too.
const GRID_SLOTS = Array.from(
  { length: (TIMELINE.endHour - TIMELINE.startHour) * 2 + 1 },
  (_, i) => {
    const totalMin = TIMELINE.startHour * 60 + i * 30;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;

    return {
      topPx: i * HALF_SLOT_PX,
      isHour: m === 0,
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    };
  },
);

// ── Positioning helpers ───────────────────────────────────────────────────────

function appointmentLayout(appt: Appointment): { top: number; height: number } | null {
  const startMin = appt.startTime.getHours() * 60 + appt.startTime.getMinutes();
  const endMin = appt.endTime.getHours() * 60 + appt.endTime.getMinutes();

  const clampedStart = Math.max(startMin, TIMELINE_START_MIN);
  const clampedEnd = Math.min(endMin, TIMELINE_END_MIN);

  if (clampedEnd <= clampedStart) return null;

  return {
    top: Math.round((clampedStart - TIMELINE_START_MIN) * MINUTE_HEIGHT),
    height: Math.round((clampedEnd - clampedStart) * MINUTE_HEIGHT),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarV2Timeline({ selectedDate, appointments, onEditAppointment }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayAppointments = appointments.filter((a) => isSameDay(a.startTime, selectedDate));

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

  const showNowIndicator = nowOffsetPx >= 0 && nowOffsetPx <= TOTAL_HEIGHT_PX;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-white"
      style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 72 }}
    >
      <div className="relative mt-2" style={{ height: TOTAL_HEIGHT_PX }}>
        {/* Layer 0: one continuous grid across the whole timeline */}
        <div className="absolute inset-0 z-0 pointer-events-none">
{GRID_SLOTS.map((slot) =>
  slot.isHour ? (
    <div
      key={slot.topPx}
      className="absolute inset-x-0 border-t border-[#d8d5de]"
      style={{ top: slot.topPx }}
    />
  ) : (
    <div
      key={slot.topPx}
      className="absolute inset-x-0 h-px"
      style={{
        top: slot.topPx,
        backgroundImage:
          'repeating-linear-gradient(to left, #eceaef 0 3px, transparent 3px 6px)',
      }}
    />
  ),
)}
        </div>
        {/*
         * ── Layer A: right-side time-label column ─────────────────────────────
         *
         * This layer is separate from the main timeline layer so grid lines and
         * appointment cards never enter the label column.
         *
         * Each time label has a small line behind it and a white background mask
         * around the text, creating a clean “line reaches the time but does not
         * cross the text” effect. Hour labels use solid lines; half-hour labels
         * use dashed lines.
         */}
        <div
          className="absolute top-0 right-0 z-[4] pointer-events-none"
          style={{ width: TIME_LABEL_WIDTH, height: TOTAL_HEIGHT_PX }}
        >
          {GRID_SLOTS.map((slot) => (
            <div
              key={slot.topPx}
              className="absolute inset-x-0 h-5 flex items-center justify-center"
              style={{
                top: slot.topPx,
                transform: 'translateY(-50%)',
              }}
            >

              <span
                className={[
                  'relative inline-flex h-5 translate-y-[1px] items-center bg-white leading-[20px]',
                  slot.isHour
                    ? 'px-1 text-[11px] text-[#6b5b7a]'
                    : 'px-0.5 text-[9px] text-[#9a93a3]',
                ].join(' ')}
              >
                {slot.label}
              </span>
            </div>
          ))}
        </div>

        {/*
         * ── Layer B: main timeline area ───────────────────────────────────────
         *
         * The layer starts to the left of the time-label column.
         * The vertical axis sits exactly at this boundary.
         */}
        <div
          className="absolute top-0 left-0"
          style={{ right: TIME_LABEL_WIDTH, height: TOTAL_HEIGHT_PX }}
        >

          {/* Vertical separator line between the time axis and appointments */}
          <div className="absolute top-0 bottom-0 right-0 z-[1] w-px bg-[#d8d5de] pointer-events-none" />

          {/* Appointment cards */}
          {dayAppointments.map((appt) => {
            const layout = appointmentLayout(appt);
            if (!layout) return null;

            return (
              <div
                key={appt.id}
                className="absolute z-[2] overflow-hidden"
                style={{
                  top: layout.top,
                  height: layout.height,
                  right: APPT_INSET_PX,
                  left: APPT_INSET_PX,
                }}
              >
                <CalendarV2AppointmentCard
                  customerName={appt.customer.name}
                  startTime={formatTime(appt.startTime)}
                  endTime={formatTime(appt.endTime)}
                  serviceName={appt.service.name}
                  note={appt.notes}
                  onEdit={onEditAppointment ? () => onEditAppointment(appt.id) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
