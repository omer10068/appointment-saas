'use client';

import { HEBREW_DAY_ABBR } from '@/app/app/_lib/calendar.utils';
import type { AdminWorkingHourDto } from '@/lib/admin-api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HourRow {
  dayOfWeek: number;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function defaultHours(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isClosed: i === 5 || i === 6, // Friday + Saturday closed by default
    startTime: '09:00',
    endTime: '17:00',
  }));
}

export function initHoursFromData(loaded: AdminWorkingHourDto[]): HourRow[] {
  const base = defaultHours();
  if (loaded.length === 0) return base;
  const map = new Map(loaded.map((h) => [h.dayOfWeek, h]));
  return base.map((d) => {
    const l = map.get(d.dayOfWeek);
    if (!l) return d;
    return {
      dayOfWeek: l.dayOfWeek,
      isClosed: l.isClosed,
      startTime: l.startTime ?? '09:00',
      endTime: l.endTime ?? '17:00',
    };
  });
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function DayToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'cursor-default opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Use right/left (not translate) to avoid RTL transform issues */}
      <span
        className={[
          'pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
          checked ? 'right-1' : 'left-1',
        ].join(' ')}
      />
    </button>
  );
}

// ─── Single day row ───────────────────────────────────────────────────────────

function DayRow({
  row,
  onDayChange,
  disabled,
}: {
  row: HourRow;
  onDayChange: (dayOfWeek: number, patch: Partial<HourRow>) => void;
  disabled: boolean;
}) {
  const dayName = HEBREW_DAY_ABBR[row.dayOfWeek] ?? String(row.dayOfWeek);
  const isOpen = !row.isClosed;

  return (
    <div className="space-y-2.5 border-b border-border py-3.5 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{dayName}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {isOpen ? 'פתוח' : 'סגור'}
          </span>
          <DayToggle
            checked={isOpen}
            onChange={() => onDayChange(row.dayOfWeek, { isClosed: !row.isClosed })}
            disabled={disabled}
          />
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">פתיחה</span>
            <span className="text-xs text-muted-foreground">סגירה</span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="time"
              value={row.startTime}
              onChange={(e) => onDayChange(row.dayOfWeek, { startTime: e.target.value })}
              disabled={disabled}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <span className="shrink-0 text-sm text-muted-foreground">—</span>
            <input
              type="time"
              value={row.endTime}
              onChange={(e) => onDayChange(row.dayOfWeek, { endTime: e.target.value })}
              disabled={disabled}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week hours editor ────────────────────────────────────────────────────────

interface WeekHoursEditorProps {
  hours: HourRow[];
  onDayChange: (dayOfWeek: number, patch: Partial<HourRow>) => void;
  disabled: boolean;
}

export function WeekHoursEditor({ hours, onDayChange, disabled }: WeekHoursEditorProps) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-1">
      {hours.map((row) => (
        <DayRow
          key={row.dayOfWeek}
          row={row}
          onDayChange={onDayChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
