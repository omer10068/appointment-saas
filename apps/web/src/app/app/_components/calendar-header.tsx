'use client';

import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { formatNumericDate, isCurrentWeek } from '../_lib/calendar.utils';

// ─── Date control ──────────────────────────────────────────────────────────────

interface DateControlProps {
  selectedDate: Date;
  onClick: () => void;
}

function CalendarDateControl({ selectedDate, onClick }: DateControlProps) {
  const label = formatNumericDate(selectedDate);
  return (
    <button
      onClick={onClick}
      aria-label={`לוח שנה — ${label}`}
      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 transition active:scale-95 active:opacity-75"
    >
      <CalendarDays className="size-3.5 shrink-0 text-primary" />
      <span dir="ltr" className="text-xs font-bold tabular-nums text-foreground">
        {label}
      </span>
    </button>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

interface Props {
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onOpenCalendar: () => void;
}

export function CalendarHeader({ selectedDate, onPrevWeek, onNextWeek, onToday, onOpenCalendar }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // dir="rtl" inherited — DOM order maps to visual RTL positions:
    // [היום] [›] [date control] [‹]  →  visual: [‹] [date control] [›] [היום]
    <div className="flex items-center gap-1 px-1 pb-2.5">
      {/* Far right in RTL — today shortcut */}
      <button
        onClick={onCurrentWeek ? undefined : onToday}
        disabled={onCurrentWeek}
        aria-label="חזור להיום"
        className={[
          'flex h-7 items-center rounded-full px-2 text-[11px] font-semibold transition',
          onCurrentWeek
            ? 'cursor-default text-muted-foreground/30'
            : 'text-primary active:opacity-70',
        ].join(' ')}
      >
        היום
      </button>

      {/* Previous week */}
      <button
        onClick={onPrevWeek}
        aria-label="שבוע קודם"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Unified date + calendar picker — centered */}
      <div className="flex flex-1 justify-center">
        <CalendarDateControl selectedDate={selectedDate} onClick={onOpenCalendar} />
      </div>

      {/* Next week */}
      <button
        onClick={onNextWeek}
        aria-label="שבוע הבא"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}
