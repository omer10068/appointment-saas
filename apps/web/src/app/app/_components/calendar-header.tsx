'use client';

import { ChevronDown, CalendarDays } from 'lucide-react';
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
      <span className="font-bold text-[11px] leading-none text-foreground">יום {weekday}</span>
      {/* dir="ltr" keeps the calendar icon visually to the left of the numeric date */}
      <span dir="ltr" className="flex items-center gap-1">
        <CalendarDays className="size-3 shrink-0 text-muted-foreground/40" />
        <span className="text-[11px] font-medium tabular-nums leading-none text-muted-foreground">
          {numeric}
        </span>
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
  /** Current provider filter label, e.g. "כל הצוות" or "יובל". */
  filterLabel: string;
  /** False when only one provider exists — pill becomes a passive status indicator. */
  canFilter: boolean;
}

export function CalendarHeader({ selectedDate, onToday, onOpenCalendar, onFilterPress, filterLabel, canFilter }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // Title is absolutely centered so it stays fixed regardless of side-element widths.
    // DOM order: [filter (visual right in RTL)] ... [היום (visual left in RTL)]
    <div className="relative flex items-center justify-between px-1 pb-2.5">

      {/* DOM first = visual right in RTL — provider filter pill */}
      <button
        onClick={canFilter ? onFilterPress : undefined}
        disabled={!canFilter}
        aria-label="בחירת איש צוות"
        className={[
          'flex h-7 max-w-26 shrink-0 items-center gap-1 rounded-full border px-2.5 transition',
          canFilter
            ? 'border-border/40 text-muted-foreground/70 active:scale-95 active:opacity-70'
            : 'cursor-default border-border/20 text-muted-foreground/40',
        ].join(' ')}
      >
        <span className="truncate text-[11px] font-medium">{filterLabel}</span>
        {canFilter && <ChevronDown className="size-3 shrink-0 opacity-60" />}
      </button>

      {/* Center — absolutely overlaid so side elements never shift it */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="pointer-events-auto">
          <CalendarSelectedDayTitle selectedDate={selectedDate} onClick={onOpenCalendar} />
        </div>
      </div>

      {/* DOM last = visual left in RTL — today ghost pill */}
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
    </div>
  );
}
