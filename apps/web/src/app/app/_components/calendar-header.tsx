'use client';

import { Users } from 'lucide-react';
import { HEBREW_DAY_ABBR, formatNumericDate, isCurrentWeek } from '../_lib/calendar.utils';

// ─── Selected-day title ────────────────────────────────────────────────────────

interface DateControlProps {
  selectedDate: Date;
  onClick: () => void;
}

function CalendarSelectedDayTitle({ selectedDate, onClick }: DateControlProps) {
  const weekday = HEBREW_DAY_ABBR[selectedDate.getDay()];
  const numeric = formatNumericDate(selectedDate);
  return (
    <button
      onClick={onClick}
      aria-label={`לוח שנה — ${weekday} ${numeric}`}
      className="flex flex-col items-center gap-0.5 px-2 py-1 transition active:opacity-75"
    >
      <span className="font-bold text-xs leading-none text-foreground">{weekday}</span>
      <span dir="ltr" className="text-[11px] font-medium tabular-nums leading-none text-muted-foreground">
        {numeric}
      </span>
    </button>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

interface Props {
  selectedDate: Date;
  onToday: () => void;
  onOpenCalendar: () => void;
  onFilterPress: () => void;
}

export function CalendarHeader({ selectedDate, onToday, onOpenCalendar, onFilterPress }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // Three-slot justify-between keeps the date title exactly centered:
    //   DOM: [היום w-12] [title] [spacer w-12]
    //   RTL visual: [spacer] [title] [היום]
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

      {/* Center — selected-day title (taps to open date picker) */}
      <CalendarSelectedDayTitle selectedDate={selectedDate} onClick={onOpenCalendar} />

      {/* Left in RTL — team/provider filter, balances היום on the opposite side */}
      <button
        onClick={onFilterPress}
        aria-label="סינון לפי איש צוות"
        className="flex h-7 w-12 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted-foreground/70 transition active:scale-95 active:opacity-70"
      >
        <Users className="size-3.5" />
      </button>
    </div>
  );
}
