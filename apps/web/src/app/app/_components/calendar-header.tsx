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
    // dir="rtl" inherited.
    // Three-slot justify-between keeps the nav group exactly centered:
    //   DOM: [היום w-12] [‹ date ›] [spacer w-12]
    //   RTL visual: [spacer] [‹ date ›] [היום]
    <div className="flex items-center justify-between px-1 pb-2.5">

      {/* Right in RTL — today ghost pill */}
      <button
        onClick={onCurrentWeek ? undefined : onToday}
        disabled={onCurrentWeek}
        aria-label="חזור להיום"
        className={[
          'flex h-7 w-12 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition',
          onCurrentWeek
            ? 'cursor-default border-muted-foreground/20 text-muted-foreground/30'
            : 'border-primary/40 text-primary active:scale-95 active:opacity-70',
        ].join(' ')}
      >
        היום
      </button>

      {/* Center — prev + date control + next, grouped as one navigation unit */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrevWeek}
          aria-label="שבוע קודם"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 active:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>

        <CalendarDateControl selectedDate={selectedDate} onClick={onOpenCalendar} />

        <button
          onClick={onNextWeek}
          aria-label="שבוע הבא"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 active:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* Left in RTL — invisible balance spacer matching today button width */}
      <div className="w-12 shrink-0" aria-hidden="true" />
    </div>
  );
}
