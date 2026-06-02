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
