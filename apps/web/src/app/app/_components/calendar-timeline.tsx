'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { Appointment, AppointmentStatus, ServiceProvider } from '../_lib/calendar.types';
import { TIMELINE, LAYOUT } from '../_lib/calendar.design';
import { isSameDay, formatTime, minutesFromMidnightInTimeZone } from '../_lib/calendar.utils';
import { computeTimelineRange, type WorkingHourBound } from '../_lib/timeline-range';
import { CalendarAppointmentCard } from './calendar-appointment-card';
import { CalendarEmptyState } from './calendar-empty-state';

interface Props {
  selectedDate: Date;
  appointments: Appointment[];
  timezone: string;
  onSelectAppointment?: (appointment: Appointment) => void;
  /** When provided with 2+ providers, the timeline switches to side-by-side lane mode. */
  serviceProviders?: ServiceProvider[];
  /** Open business-hours windows used to anchor the visible time range. */
  businessWorkingHours?: WorkingHourBound[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const APPT_VERTICAL_GAP_PX = 3;
const TIME_LABEL_WIDTH = 56;
const APPT_INSET_PX = 8;
const LANE_INSET_PX = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

const CANCELLED_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'cancelled_by_customer',
  'cancelled_by_business',
]);

function appointmentLayout(
  appt: Appointment,
  timezone: string,
  rangeStartMin: number,
  rangeEndMin: number,
  minuteHeight: number,
): { top: number; height: number } | null {
  const startMin = minutesFromMidnightInTimeZone(appt.startTime, timezone);
  const endMin   = minutesFromMidnightInTimeZone(appt.endTime,   timezone);
  // Clamp to the grid. Because rangeEndMin already extends past all appointment
  // end times (see computeTimelineRange), clampedEnd === endMin for well-formed data.
  const clampedStart = Math.max(startMin, rangeStartMin);
  const clampedEnd   = Math.min(endMin,   rangeEndMin);
  if (clampedEnd <= clampedStart) return null;
  return {
    top:    Math.round((clampedStart - rangeStartMin) * minuteHeight),
    height: Math.round((clampedEnd   - clampedStart)  * minuteHeight),
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
function resolveRenderList(
  appts: Appointment[],
  timezone: string,
  rangeStartMin: number,
  rangeEndMin: number,
  minuteHeight: number,
): Appointment[] {
  const layout = (a: Appointment) =>
    appointmentLayout(a, timezone, rangeStartMin, rangeEndMin, minuteHeight);

  const active    = appts.filter((a) => !CANCELLED_STATUSES.has(a.status));
  const cancelled = appts.filter((a) =>  CANCELLED_STATUSES.has(a.status));

  if (cancelled.length === 0) return active;

  const activeLayouts = active
    .map(layout)
    .filter((l): l is NonNullable<typeof l> => l !== null);

  // Step 1: drop cancelled that overlap any active
  const nonOverlapping = cancelled.filter((ca) => {
    const caL = layout(ca);
    if (!caL) return false;
    return !activeLayouts.some((aL) => pixelsOverlap(caL, aL));
  });

  // Step 2: deduplicate overlapping cancelled-only clusters (keep first in order)
  const surviving: Appointment[] = [];
  const survivingLayouts: { top: number; height: number }[] = [];

  for (const ca of nonOverlapping) {
    const caL = layout(ca);
    if (!caL) continue;
    if (!survivingLayouts.some((kL) => pixelsOverlap(caL, kL))) {
      surviving.push(ca);
      survivingLayouts.push(caL);
    }
  }

  return [...active, ...surviving];
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CalendarTimeline({
  selectedDate,
  appointments,
  timezone,
  onSelectAppointment,
  serviceProviders,
  businessWorkingHours,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dayAppointments = appointments.filter((a) => isSameDay(a.startTime, selectedDate));
  const laneProviders = serviceProviders && serviceProviders.length > 1 ? serviceProviders : null;

  // ── Dynamic time range ──────────────────────────────────────────────────────
  // Computed from all week appointments + optional business hours so the grid
  // always extends far enough to display every appointment without clipping.
  const { startMin, endMin } = useMemo(
    () => computeTimelineRange(appointments, timezone, businessWorkingHours),
    [appointments, timezone, businessWorkingHours],
  );

  const minuteHeight  = TIMELINE.slotHeightPx / 60;
  const totalHeightPx = ((endMin - startMin) / 60) * TIMELINE.slotHeightPx;
  const halfSlotPx    = TIMELINE.slotHeightPx / 2;

  const gridSlots = useMemo(() => {
    const slots: { topPx: number; isHour: boolean; label: string }[] = [];
    for (let min = startMin; min <= endMin; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      slots.push({
        topPx:  ((min - startMin) / 60) * TIMELINE.slotHeightPx,
        isHour: m === 0,
        label:  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      });
    }
    return slots;
  }, [startMin, endMin]);

  // Helper bound to current range — used in render and scroll effect
  const layout = (appt: Appointment) =>
    appointmentLayout(appt, timezone, startMin, endMin, minuteHeight);

  const renderList = (appts: Appointment[]) =>
    resolveRenderList(appts, timezone, startMin, endMin, minuteHeight);

  // ── Scroll tracking ─────────────────────────────────────────────────────────
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
    const l = layout(earliest);
    if (!l) return;

    // Scroll so the first appointment has ~32 px of breathing room above it.
    scrollRef.current.scrollTop = Math.max(0, l.top - 32);
  // layout is an inline function; depend on its inputs instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, appointments, timezone, startMin, endMin, minuteHeight]);

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
          className="flex-none flex bg-muted/30"
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
        <div className="relative mt-2" style={{ height: totalHeightPx }}>

          {/* ── Layer 0: grid lines ───────────────────────────────────────── */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {gridSlots.map((slot) =>
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
            style={{ width: TIME_LABEL_WIDTH, height: totalHeightPx }}
          >
            {gridSlots.filter((slot) => slot.isHour).map((slot) => (
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
            style={{ right: TIME_LABEL_WIDTH, height: totalHeightPx }}
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
                  const laneWidthPct  = 100 / laneProviders.length;
                  const laneRightPct  = i * laneWidthPct;
                  const laneAppts     = dayAppointments.filter((a) => a.provider.id === sp.id);

                  return (
                    <Fragment key={sp.id}>
                      {renderList(laneAppts).map((appt) => {
                        const l = layout(appt);
                        if (!l) return null;
                        return (
                          <div
                            key={appt.id}
                            className="absolute z-2"
                            style={{
                              top:    l.top,
                              height: l.height,
                              right:  `${laneRightPct}%`,
                              width:  `${laneWidthPct}%`,
                            }}
                          >
                            <div
                              className="absolute overflow-hidden rounded-l-xl rounded-r-sm"
                              style={{
                                top:    APPT_VERTICAL_GAP_PX,
                                bottom: APPT_VERTICAL_GAP_PX,
                                right:  LANE_INSET_PX,
                                left:   LANE_INSET_PX,
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
                                  width:  Math.max(0, (containerWidth - TIME_LABEL_WIDTH) / laneProviders.length - LANE_INSET_PX * 2),
                                  height: Math.max(0, l.height - APPT_VERTICAL_GAP_PX * 2),
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
              renderList(dayAppointments).map((appt) => {
                const l = layout(appt);
                if (!l) return null;
                return (
                  <div
                    key={appt.id}
                    className="absolute z-2"
                    style={{
                      top:    l.top,
                      height: l.height,
                      right:  0,
                      left:   APPT_INSET_PX,
                    }}
                  >
                    <div
                      className="absolute inset-x-0 overflow-hidden rounded-l-xl rounded-r-sm"
                      style={{
                        top:    APPT_VERTICAL_GAP_PX,
                        bottom: APPT_VERTICAL_GAP_PX,
                        right:  LANE_INSET_PX,
                        left:   LANE_INSET_PX,
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
                          width:  Math.max(0, containerWidth - TIME_LABEL_WIDTH - APPT_INSET_PX),
                          height: Math.max(0, l.height - APPT_VERTICAL_GAP_PX * 2),
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
