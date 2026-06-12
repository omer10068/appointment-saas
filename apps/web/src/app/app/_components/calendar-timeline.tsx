'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import type { Appointment, AppointmentStatus, ServiceProvider } from '../_lib/calendar.types';
import { TIMELINE, LAYOUT } from '../_lib/calendar.design';
import { isSameDay, formatTime, minutesFromMidnightInTimeZone } from '../_lib/calendar.utils';
import { CalendarAppointmentCard } from './calendar-appointment-card';
import { CalendarEmptyState } from './calendar-empty-state';

interface Props {
  selectedDate: Date;
  appointments: Appointment[];
  timezone: string;
  onSelectAppointment?: (appointment: Appointment) => void;
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

const CANCELLED_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'cancelled_by_customer',
  'cancelled_by_business',
]);

function appointmentLayout(
  appt: Appointment,
  timezone: string,
): { top: number; height: number } | null {
  const startMin = minutesFromMidnightInTimeZone(appt.startTime, timezone);
  const endMin = minutesFromMidnightInTimeZone(appt.endTime, timezone);
  const clampedStart = Math.max(startMin, TIMELINE_START_MIN);
  const clampedEnd = Math.min(endMin, TIMELINE_END_MIN);
  if (clampedEnd <= clampedStart) return null;
  return {
    top: Math.round((clampedStart - TIMELINE_START_MIN) * MINUTE_HEIGHT),
    height: Math.round((clampedEnd - clampedStart) * MINUTE_HEIGHT),
  };
}

function pixelsOverlap(
  a: { top: number; height: number },
  b: { top: number; height: number },
): boolean {
  return a.top < b.top + b.height && a.top + a.height > b.top;
}

/**
 * Resolves the final render list for a lane:
 *
 * 1. Cancelled appointments that overlap ANY non-cancelled appointment are
 *    completely suppressed — the active card is the only thing shown.
 * 2. Among remaining cancelled (cancelled-only slots), overlapping cancelled
 *    cards are deduplicated: the first one in array order is kept, the rest
 *    suppressed. Array order reflects API insertion order (createdAt asc),
 *    so the earliest-created record is preferred without adding extra fields.
 *
 * Active appointments are always preserved and returned first.
 */
function resolveRenderList(appts: Appointment[], timezone: string): Appointment[] {
  const active = appts.filter((a) => !CANCELLED_STATUSES.has(a.status));
  const cancelled = appts.filter((a) => CANCELLED_STATUSES.has(a.status));

  if (cancelled.length === 0) return active;

  // Pre-compute layouts for active appointments
  const activeLayouts = active
    .map((a) => appointmentLayout(a, timezone))
    .filter((l): l is NonNullable<typeof l> => l !== null);

  // Step 1: drop cancelled that overlap any active
  const nonOverlapping = cancelled.filter((ca) => {
    const caL = appointmentLayout(ca, timezone);
    if (!caL) return false;
    return !activeLayouts.some((aL) => pixelsOverlap(caL, aL));
  });

  // Step 2: deduplicate overlapping cancelled-only clusters (keep first in order)
  const surviving: Appointment[] = [];
  const survivingLayouts: { top: number; height: number }[] = [];

  for (const ca of nonOverlapping) {
    const caL = appointmentLayout(ca, timezone);
    if (!caL) continue;
    if (!survivingLayouts.some((kL) => pixelsOverlap(caL, kL))) {
      surviving.push(ca);
      survivingLayouts.push(caL);
    }
  }

  return [...active, ...surviving];
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CalendarTimeline({ selectedDate, appointments, timezone, onSelectAppointment, serviceProviders }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dayAppointments = appointments.filter((a) => isSameDay(a.startTime, selectedDate));
  const laneProviders = serviceProviders && serviceProviders.length > 1 ? serviceProviders : null;

  // Tracks whether we've already scrolled for the current date.
  // Prevents re-scrolling on status refreshes after the user has scrolled manually.
  const scrolledDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;

    const dateKey = selectedDate.toDateString();

    // New date selected — reset to top and clear the guard so we scroll once appointments load.
    if (scrolledDateRef.current !== dateKey) {
      scrollRef.current.scrollTop = 0;
    }

    const dayAppts = appointments.filter((a) => isSameDay(a.startTime, selectedDate));
    if (dayAppts.length === 0) {
      scrolledDateRef.current = null;
      return;
    }

    // Already scrolled for this date — don't jump again.
    if (scrolledDateRef.current === dateKey) return;
    scrolledDateRef.current = dateKey;

    const earliest = dayAppts.reduce((prev, curr) =>
      curr.startTime < prev.startTime ? curr : prev,
    );
    const layout = appointmentLayout(earliest, timezone);
    if (!layout) return;

    // Scroll so the first appointment has ~32 px of breathing room above it.
    scrollRef.current.scrollTop = Math.max(0, layout.top - 32);
  }, [selectedDate, appointments, timezone]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  if (dayAppointments.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col bg-muted/30 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <CalendarEmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Provider column headers — outside scroll container to avoid sticky jitter */}
      {laneProviders && (
        <div
          className="flex-none flex bg-card"
          style={{ paddingRight: TIME_LABEL_WIDTH }}
        >
          {laneProviders.map((sp, i) => (
            <div
              key={sp.id}
              className={[
                'flex flex-1 items-center justify-center py-2',
                i > 0 ? 'border-r border-border/10' : '',
              ].join(' ')}
            >
              <span className="truncate px-1 text-[11px] font-semibold leading-none text-muted-foreground/80">
                {sp.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-muted/30 scrollbar-none [&::-webkit-scrollbar]:hidden"
      style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 104 }}
    >
      <div className="relative mt-2" style={{ height: TOTAL_HEIGHT_PX }}>

        {/* ── Layer 0: grid lines ───────────────────────────────────────── */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {GRID_SLOTS.map((slot) =>
            slot.isHour ? (
              <div
                key={slot.topPx}
                className="absolute h-px bg-border/40"
                style={{ top: slot.topPx, left: 0, right: TIME_LABEL_WIDTH }}
              />
            ) : (
              <div
                key={slot.topPx}
                className="absolute border-t border-dashed border-border/30"
                style={{ top: slot.topPx, left: 0, right: TIME_LABEL_WIDTH }}
              />
            ),
          )}
        </div>

        {/* ── Layer A: time labels (right column, hour marks only) ────────── */}
        <div
          className="absolute top-0 right-0 z-4 pointer-events-none"
          style={{ width: TIME_LABEL_WIDTH, height: TOTAL_HEIGHT_PX }}
        >
          {GRID_SLOTS.filter((slot) => slot.isHour).map((slot) => (
            <div
              key={slot.topPx}
              className="absolute inset-x-0 h-5 flex items-center justify-center"
              style={{ top: slot.topPx, transform: 'translateY(-50%)' }}
            >
              <span className="relative inline-flex h-5 translate-y-px items-center px-1 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground/80">
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
          {laneProviders ? (
            <>
              {/* Vertical lane separators */}
              {laneProviders.slice(1).map((_, i) => (
                <div
                  key={`lane-sep-${i}`}
                  className="absolute top-0 bottom-0 z-1 w-px bg-border/20 pointer-events-none"
                  style={{ right: `${((i + 1) * 100) / laneProviders.length}%` }}
                />
              ))}

              {/* Appointments grouped by lane */}
              {laneProviders.map((sp, i) => {
                const laneWidthPct = 100 / laneProviders.length;
                const laneRightPct = i * laneWidthPct;
                const laneAppts = dayAppointments.filter((a) => a.provider.id === sp.id);
                const renderList = resolveRenderList(laneAppts, timezone);

                return (
                  <Fragment key={sp.id}>
                    {renderList.map((appt) => {
                      const layout = appointmentLayout(appt, timezone);
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
                            className="absolute overflow-hidden rounded-l-xl rounded-r-sm"
                            style={{
                              top: APPT_VERTICAL_GAP_PX,
                              bottom: APPT_VERTICAL_GAP_PX,
                              right: LANE_INSET_PX,
                              left: LANE_INSET_PX,
                            }}
                          >
                            <CalendarAppointmentCard
                              customerName={appt.customer.name}
                              startTime={formatTime(appt.startTime, timezone)}
                              endTime={formatTime(appt.endTime, timezone)}
                              serviceName={appt.service.name}
                              color={appt.service.color}
                              status={appt.status}
                              serviceProviderName={appt.provider.name}
                              note={appt.notes}
                              cardSize={{
                                width: Math.max(0, (containerWidth - TIME_LABEL_WIDTH) / laneProviders.length - LANE_INSET_PX * 2),
                                height: Math.max(0, layout.height - APPT_VERTICAL_GAP_PX * 2),
                              }}
                              onClick={
                                onSelectAppointment ? () => onSelectAppointment(appt) : undefined
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
            // ── Single-provider mode ──────────────────────────────────────
            resolveRenderList(dayAppointments, timezone).map((appt) => {
              const layout = appointmentLayout(appt, timezone);
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
                    className="absolute inset-x-0 overflow-hidden rounded-l-xl rounded-r-sm"
                    style={{
                      top: APPT_VERTICAL_GAP_PX,
                      bottom: APPT_VERTICAL_GAP_PX,
                      right: LANE_INSET_PX,
                      left: LANE_INSET_PX,
                    }}
                  >
                    <CalendarAppointmentCard
                      customerName={appt.customer.name}
                      startTime={formatTime(appt.startTime, timezone)}
                      endTime={formatTime(appt.endTime, timezone)}
                      serviceName={appt.service.name}
                      color={appt.service.color}
                      status={appt.status}
                      serviceProviderName={appt.provider.name}
                      note={appt.notes}
                      cardSize={{
                        width: Math.max(0, containerWidth - TIME_LABEL_WIDTH - APPT_INSET_PX),
                        height: Math.max(0, layout.height - APPT_VERTICAL_GAP_PX * 2),
                      }}
                      onClick={
                        onSelectAppointment ? () => onSelectAppointment(appt) : undefined
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
    </div>
  );
}
