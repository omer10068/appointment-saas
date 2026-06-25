import { minutesFromMidnightInTimeZone } from './calendar.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkingHourBound {
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
}

export interface TimelineRange {
  /** Minutes from midnight for the top of the visible grid */
  startMin: number;
  /** Minutes from midnight for the bottom of the visible grid */
  endMin: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_MIN = 30;          // calendar grid granularity (minutes)
const BUFFER_SLOTS = 1;       // extra slots below the latest end before clipping
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHHmm(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

// ─── Main utility ─────────────────────────────────────────────────────────────

/**
 * Computes the dynamic visible range for the calendar timeline.
 *
 * Start: the earliest of (business hours start, appointment starts) rounded DOWN
 *        to the nearest 30-minute slot.
 * End:   the latest of (business hours end, appointment ends) rounded UP to the
 *        nearest 30-minute slot plus one extra buffer slot.
 *
 * Falls back to 08:00–20:30 only when BOTH inputs are empty (no appointments
 * and no businessHours). When any data is present the range is computed purely
 * from that data so the grid fits the actual business schedule.
 *
 * Appointment end times are included so no appointment is ever clipped at the
 * bottom — existing appointments outside current business hours remain visible.
 *
 * @param appointments  Appointments for the week (or day). startTime AND endTime
 *                      are both considered.
 * @param timezone      IANA timezone used to convert UTC Date values to local minutes.
 * @param businessHours Optional open business-hours windows that anchor the grid
 *                      to the business schedule. Pass only the open (non-closed) rows.
 */
export function computeTimelineRange(
  appointments: Array<{ startTime: Date; endTime: Date }>,
  timezone: string,
  businessHours?: WorkingHourBound[],
): TimelineRange {
  const hasData = appointments.length > 0 || (businessHours?.length ?? 0) > 0;

  // Use fallback sentinels when there is data so the range is derived purely
  // from that data. Use the default hours when there is nothing to derive from.
  let earliestMin = hasData ? Infinity  : DEFAULT_START_HOUR * 60;
  let latestMin   = hasData ? -Infinity : DEFAULT_END_HOUR   * 60;

  // Business-hours windows anchor the grid to the configured schedule
  for (const wh of businessHours ?? []) {
    earliestMin = Math.min(earliestMin, parseHHmm(wh.startTime));
    latestMin   = Math.max(latestMin,   parseHHmm(wh.endTime));
  }

  // Appointment times extend the range — both start and end — so no event is hidden
  for (const appt of appointments) {
    earliestMin = Math.min(earliestMin, minutesFromMidnightInTimeZone(appt.startTime, timezone));
    latestMin   = Math.max(latestMin,   minutesFromMidnightInTimeZone(appt.endTime,   timezone));
  }

  // Guard against the (impossible) all-sentinel case
  if (!isFinite(earliestMin)) earliestMin = DEFAULT_START_HOUR * 60;
  if (!isFinite(latestMin))   latestMin   = DEFAULT_END_HOUR   * 60;

  // Round boundaries to the 30-minute grid, then add a trailing buffer
  const startMin = Math.floor(earliestMin / SLOT_MIN) * SLOT_MIN;
  const endMin   = Math.ceil(latestMin   / SLOT_MIN) * SLOT_MIN + BUFFER_SLOTS * SLOT_MIN;

  return { startMin, endMin };
}
