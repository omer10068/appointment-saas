'use client';

import { useEffect, useRef, Fragment } from 'react';
import type { Appointment, ServiceProvider } from '../_lib/calendar-v2.types';
import { TIMELINE, LAYOUT } from '../_lib/calendar-v2.design';
import { isSameDay, formatTime } from '../_lib/calendar-v2.utils';
import { CalendarV2AppointmentCard } from './calendar-v2-appointment-card';
import { CalendarV2EmptyState } from './calendar-v2-empty-state';

interface Props {
  selectedDate: Date;
  appointments: Appointment[];
  onEditAppointment?: (id: string) => void;
  /** When provided with 2+ providers, the timeline switches to side-by-side lane mode. */
  serviceProviders?: ServiceProvider[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const APPT_VERTICAL_GAP_PX = 3;
const TIME_LABEL_WIDTH = 56;
const APPT_INSET_PX = 8;
const LANE_INSET_PX = 4;

const MINUTE_HEIGHT = TIMELINE.slotHeightPx / 60;
const TIMELINE_START_MIN = TIMELINE.startHour * 60;
const TIMELINE_END_MIN = TIMELINE.endHour * 60;
const TOTAL_HEIGHT_PX = (TIMELINE.endHour - TIMELINE.startHour) * TIMELINE.slotHeightPx;
const HALF_SLOT_PX = TIMELINE.slotHeightPx / 2;

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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
export function CalendarV2Timeline({ selectedDate, appointments, onEditAppointment, serviceProviders }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayAppointments = appointments.filter((a) => isSameDay(a.startTime, selectedDate));
  const laneProviders = serviceProviders && serviceProviders.length > 1 ? serviceProviders : null;

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [selectedDate]);

  if (dayAppointments.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <CalendarV2EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-transparent"
      style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 72 }}
    >
      {/*
       * mt-2 creates an 8px gap above the timeline.
       * Lane name labels use translateY(-50%) to center on the top (8:00) grid
       * line — the 8px gap is exactly enough to keep them inside the scroll area.
       */}
      <div className="relative mt-2" style={{ height: TOTAL_HEIGHT_PX }}>

        {/* ── Layer 0: grid lines ───────────────────────────────────────── */}
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

        {/* ── Layer A: time labels (right column) ───────────────────────── */}
        <div
          className="absolute top-0 right-0 z-4 pointer-events-none"
          style={{ width: TIME_LABEL_WIDTH, height: TOTAL_HEIGHT_PX }}
        >
          {GRID_SLOTS.map((slot) => (
            <div
              key={slot.topPx}
              className="absolute inset-x-0 h-5 flex items-center justify-center"
              style={{ top: slot.topPx, transform: 'translateY(-50%)' }}
            >
              <span
                className={[
                  'relative inline-flex h-5 translate-y-px items-center bg-gray-50 leading-5',
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

        {/* ── Layer B: appointment area ──────────────────────────────────── */}
        <div
          className="absolute top-0 left-0"
          style={{ right: TIME_LABEL_WIDTH, height: TOTAL_HEIGHT_PX }}
        >
          {/* Separator between time axis and appointment area */}
          <div className="absolute top-0 bottom-0 right-0 z-1 w-px bg-[#d8d5de] pointer-events-none" />

          {laneProviders ? (
            <>
              {/* Vertical lane separators */}
              {laneProviders.slice(1).map((_, i) => (
                <div
                  key={`lane-sep-${i}`}
                  className="absolute top-0 bottom-0 z-1 w-px bg-[#d8d5de] pointer-events-none"
                  style={{ right: `${((i + 1) * 100) / laneProviders.length}%` }}
                />
              ))}

              {/*
               * Lane name labels — centered on the 8:00 grid line (top: 0).
               * translateY(-50%) lifts each label so its midpoint sits exactly
               * on the line. The bg-gray-50 mask makes the line appear to
               * continue on both sides of the text:  ───יובל───|───אביבית───
               */}
              {laneProviders.map((sp, i) => (
                <div
                  key={`lane-label-${sp.id}`}
                  className="absolute z-5 flex items-center justify-center pointer-events-none"
                  style={{
                    top: 0,
                    right: `${(i * 100) / laneProviders.length}%`,
                    width: `${100 / laneProviders.length}%`,
                    height: 16,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <span className="bg-gray-50 dark:bg-gray-950 px-1.5 text-[10px] text-gray-400 font-normal leading-none">
                    {sp.name.split(' ')[0]}
                  </span>
                </div>
              ))}

              {/* Appointments grouped by lane */}
              {laneProviders.map((sp, i) => {
                const laneWidthPct = 100 / laneProviders.length;
                const laneRightPct = i * laneWidthPct;
                const laneAppts = dayAppointments.filter((a) => a.provider.id === sp.id);

                return (
                  <Fragment key={sp.id}>
                    {laneAppts.map((appt) => {
                      const layout = appointmentLayout(appt);
                      if (!layout) return null;
                      return (
                        <div
                          key={appt.id}
                          className="absolute z-2"
                          style={{
                            top: layout.top,
                            height: layout.height,
                            right: `${laneRightPct}%`,
                            width: `${laneWidthPct}%`,
                          }}
                        >
                          <div
                            className="absolute overflow-hidden rounded-l-md rounded-r-none"
                            style={{
                              top: APPT_VERTICAL_GAP_PX,
                              bottom: APPT_VERTICAL_GAP_PX,
                              right: LANE_INSET_PX,
                              left: LANE_INSET_PX,
                            }}
                          >
                            <CalendarV2AppointmentCard
                              customerName={appt.customer.name}
                              startTime={formatTime(appt.startTime)}
                              endTime={formatTime(appt.endTime)}
                              serviceName={appt.service.name}
                              color={appt.service.color}
                              serviceProviderName={appt.provider.name}
                              note={appt.notes}
                              compact={layout.height < 50}
                              onEdit={
                                onEditAppointment ? () => onEditAppointment(appt.id) : undefined
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </>
          ) : (
            // ── Single-provider mode (unchanged) ─────────────────────────
            dayAppointments.map((appt) => {
              const layout = appointmentLayout(appt);
              if (!layout) return null;
              return (
                <div
                  key={appt.id}
                  className="absolute z-2"
                  style={{
                    top: layout.top,
                    height: layout.height,
                    right: 0,
                    left: APPT_INSET_PX,
                  }}
                >
                  <div
                    className="absolute inset-x-0 overflow-hidden rounded-l-md rounded-r-none"
                    style={{
                      top: APPT_VERTICAL_GAP_PX,
                      bottom: APPT_VERTICAL_GAP_PX,
                    }}
                  >
                    <CalendarV2AppointmentCard
                      customerName={appt.customer.name}
                      startTime={formatTime(appt.startTime)}
                      endTime={formatTime(appt.endTime)}
                      serviceName={appt.service.name}
                      color={appt.service.color}
                      serviceProviderName={appt.provider.name}
                      note={appt.notes}
                      compact={layout.height < 64}
                      onEdit={
                        onEditAppointment ? () => onEditAppointment(appt.id) : undefined
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
