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
  /** Current provider filter label shown on the pill, e.g. "כל הצוות" or "יובל". */
  filterLabel: string;
}

export function CalendarHeader({ selectedDate, onToday, onOpenCalendar, onFilterPress, filterLabel }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // Title is absolutely centered so it stays fixed regardless of side-element widths.
    // Side elements (היום, filter pill) sit at flex edges via justify-between.
    <div className="relative flex items-center justify-between px-1 pb-2.5">

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

      {/* Center — absolutely overlaid so side elements never shift it */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="pointer-events-auto">
          <CalendarSelectedDayTitle selectedDate={selectedDate} onClick={onOpenCalendar} />
        </div>
      </div>

      {/* Left in RTL — provider filter pill showing current selection */}
      <button
        onClick={onFilterPress}
        aria-label="בחירת איש צוות"
        className="flex h-7 max-w-[6.5rem] shrink-0 items-center gap-1 rounded-full border border-border/40 px-2.5 text-muted-foreground/70 transition active:scale-95 active:opacity-70"
      >
        <Users className="size-3 shrink-0" />
        <span className="truncate text-[11px] font-medium">{filterLabel}</span>
      </button>
    </div>
  );
}
