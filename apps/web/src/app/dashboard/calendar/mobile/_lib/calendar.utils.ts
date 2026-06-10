export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
] as const;

// Sunday=0 … Saturday=6 in JS Date
export const HEBREW_DAY_ABBR = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns the date as YYYY-MM-DD in the given IANA timezone.
 * Use this when building the `date` query param for the available-slots endpoint.
 * en-CA locale reliably produces ISO-style date format across all browsers.
 */
export function toLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns a localised date string in the given IANA timezone as "DD/MM/YYYY <weekday>".
 * he-IL weekday 'long' already includes "יום" (e.g. "יום ראשון"), so no prefix is added.
 */
export function formatDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('he-IL', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const day     = (parts.find((p) => p.type === 'day')?.value   ?? '').padStart(2, '0');
  const month   = (parts.find((p) => p.type === 'month')?.value ?? '').padStart(2, '0');
  const year    = parts.find((p) => p.type === 'year')?.value   ?? '';
  return `${weekday}, ${day}/${month}/${year}`;
}

/** Returns a compact date string: DD/MM/YY (e.g. 18/06/26) */
export function formatShortDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('he-IL', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(date);
  const day   = parts.find((p) => p.type === 'day')?.value   ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year  = parts.find((p) => p.type === 'year')?.value  ?? '';
  return `${day}/${month}/${year}`;
}

/**
 * Returns the time-of-day in the given IANA timezone as "HH:MM".
 * Uses Intl — no external library needed.
 */
export function formatTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

/**
 * Returns the number of minutes elapsed since midnight in the given IANA timezone.
 * Used for pixel-accurate appointment positioning on the timeline grid.
 * The % 24 guards against the "24:00" representation some runtimes emit for midnight.
 */
export function minutesFromMidnightInTimeZone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatMonthYear(date: Date): string {
  return `${HEBREW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function isCurrentWeek(date: Date): boolean {
  return isSameDay(startOfWeek(date), startOfWeek(new Date()));
}

// ─── Calendar date utilities ─────────────────────────────────────────────────

/**
 * Returns today's year, 0-based month, and day in the given IANA timezone.
 * Uses toLocalDateString for reliable cross-browser parsing.
 */
export function todayInTimezone(timezone: string): { year: number; month: number; day: number } {
  const s = toLocalDateString(new Date(), timezone); // "YYYY-MM-DD"
  return {
    year: Number(s.slice(0, 4)),
    month: Number(s.slice(5, 7)) - 1, // 0-based
    day: Number(s.slice(8, 10)),
  };
}

/**
 * Returns the day-of-week (0=Sunday … 6=Saturday) of the 1st day of the given
 * year/month in the given IANA timezone.
 * Uses UTC noon on the 1st to avoid DST edge cases.
 */
export function firstDowOfMonth(year: number, month: number, timezone: string): number {
  const d = new Date(Date.UTC(year, month, 1, 12));
  const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[dayStr] ?? 0;
}

/**
 * Returns the number of days in the given year/month (Gregorian, timezone-independent).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Hebrew weekday abbreviations (Sun=0 … Sat=6) ────────────────────────────
const HE_WEEKDAY_ABR = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const;

// en-US short weekday → 0-based index, timezone-aware
function dowInTimezone(date: Date, timezone: string): number {
  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[dayStr] ?? 0;
}

export interface DateChip {
  date: Date;
  /** YYYY-MM-DD in business timezone — stable key and used for selected-date comparison. */
  localDateStr: string;
  /** "היום", "מחר", or abbreviated Hebrew weekday (e.g. "ג׳"). */
  weekdayLabel: string;
  /** Day and month as "D/M" (e.g. "3/6"). */
  dayMonth: string;
}

/**
 * Returns `count` DateChips starting from today in the given business timezone.
 * All dates are today or in the future — never past.
 */
export function getDateStripDays(timezone: string, count = 14): DateChip[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    const localDateStr = toLocalDateString(date, timezone);

    let weekdayLabel: string;
    if (i === 0) {
      weekdayLabel = 'היום';
    } else if (i === 1) {
      weekdayLabel = 'מחר';
    } else {
      weekdayLabel = HE_WEEKDAY_ABR[dowInTimezone(date, timezone)] ?? '';
    }

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: 'numeric',
      month: 'numeric',
    }).formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const dayMonth = `${day}/${month}`;

    return { date, localDateStr, weekdayLabel, dayMonth };
  });
}

/**
 * Returns UTC ISO strings for the start and end of business-local today.
 * Pass these as `from`/`to` when fetching today's appointments.
 *
 * The UTC offset is sampled at noon UTC on the target day to avoid DST edge
 * cases (transitions almost never occur exactly at midnight).
 */
export function businessDayRange(timezone: string): { from: string; to: string } {
  const now = new Date();
  const todayStr = toLocalDateString(now, timezone); // "YYYY-MM-DD"
  const year  = Number(todayStr.slice(0, 4));
  const month = Number(todayStr.slice(5, 7)); // 1-based
  const day   = Number(todayStr.slice(8, 10));

  // Sample the UTC offset at noon UTC on the target day
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(noonUtc);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localNoonMs = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') % 24, get('minute'), get('second'),
  );
  const offsetMs = localNoonMs - noonUtc.getTime();

  // Midnight in business tz expressed as UTC = midnight-as-UTC minus the tz offset
  const midnightAsUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  const fromMs = midnightAsUtcMs - offsetMs;
  const toMs   = fromMs + 24 * 60 * 60 * 1000;

  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

/**
 * Returns true when a slot's UTC start time is strictly in the future.
 * Use this to hide already-passed slots when the selected date is today.
 * Comparison uses UTC timestamps — no timezone math needed.
 */
export function isFutureSlot(slot: { startsAt: string }): boolean {
  return new Date(slot.startsAt).getTime() > Date.now();
}

/**
 * Formats an Israeli phone number for display.
 * +972-5X-XXX-XXXX → 05X-XXX-XXXX (mobile)
 * +972-X-XXXXXXX  → 0X-XXXXXXX   (landline)
 * Other formats are returned as-is.
 */
export function formatIsraeliPhone(phone: string): string {
  const stripped = phone.replace(/\s+/g, '');
  if (stripped.startsWith('+972')) {
    const local = '0' + stripped.slice(4);
    if (local.length === 10) {
      return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
    }
    if (local.length === 9) {
      return `${local.slice(0, 2)}-${local.slice(2)}`;
    }
    return local;
  }
  return phone;
}
