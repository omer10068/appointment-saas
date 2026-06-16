'use client';

import { ChevronDown, CalendarDays, RotateCcw } from 'lucide-react';
import { HEBREW_DAY_ABBR, formatNumericDate, isCurrentWeek } from '../_lib/calendar.utils';

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
      aria-label="פתיחת לוח שנה חודשי"
      className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-secondary px-3 py-1.5 transition-colors active:bg-muted"
    >
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="text-xs text-muted-foreground" dir="ltr">{numeric}</span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

interface Props {
  selectedDate: Date;
  onToday: () => void;
  onOpenCalendar: () => void;
  onFilterPress: () => void;
  filterLabel: string;
  canFilter: boolean;
}

export function CalendarHeader({ selectedDate, onToday, onOpenCalendar, onFilterPress, filterLabel, canFilter }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // dir="ltr" so flex item order is physical (today=left, filter=right) regardless of parent RTL context
    <div dir="ltr" className="relative flex items-center pb-2.5">

      {/* Physical LEFT — today button */}
      <button
        onClick={onCurrentWeek ? undefined : onToday}
        disabled={onCurrentWeek}
        aria-label="חזור להיום"
        className={[
          'flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition',
          onCurrentWeek
            ? 'cursor-default text-muted-foreground/30'
            : 'text-primary active:scale-95 active:opacity-70',
        ].join(' ')}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        <span className="text-[9px] font-semibold leading-none">היום</span>
      </button>

      {/* Absolutely centered — date control */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="pointer-events-auto">
          <CalendarSelectedDayTitle selectedDate={selectedDate} onClick={onOpenCalendar} />
        </div>
      </div>

      {/* Physical RIGHT — provider filter pill (ml-auto pushes to right) */}
      <button
        onClick={canFilter ? onFilterPress : undefined}
        disabled={!canFilter}
        aria-label="בחירת איש צוות"
        dir="rtl"
        className={[
          'ml-auto flex max-w-26 shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 transition',
          canFilter
            ? 'border-border/50 bg-muted/30 text-foreground/70 active:scale-95 active:bg-muted/60'
            : 'cursor-default border-border/20 text-muted-foreground/40',
        ].join(' ')}
      >
        <span className="truncate text-[11px] font-semibold">{filterLabel}</span>
        {canFilter && <ChevronDown className="size-3.5 shrink-0 opacity-70" />}
      </button>
    </div>
  );
}
