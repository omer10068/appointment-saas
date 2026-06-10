'use client';

import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { formatWeekRange, isCurrentWeek } from '../_lib/calendar.utils';

// TODO: replace onToday placeholder on CalendarDays with a real month-picker handler

interface Props {
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function CalendarHeader({ selectedDate, onPrevWeek, onNextWeek, onToday }: Props) {
  const onCurrentWeek = isCurrentWeek(selectedDate);

  return (
    // dir="rtl" inherited — DOM order maps to visual RTL positions:
    // [היום] [›] [range] [‹] [🗓]  →  visual: [🗓] [‹] [range] [›] [היום]
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

      {/* Week range — centered */}
      <div className="flex-1 text-center">
        <span className="text-xs font-bold text-foreground">
          {formatWeekRange(selectedDate)}
        </span>
      </div>

      {/* Next week */}
      <button
        onClick={onNextWeek}
        aria-label="שבוע הבא"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Far left in RTL — full calendar picker (TODO: implement) */}
      <button
        onClick={() => console.log('TODO: open full calendar picker')}
        aria-label="לוח שנה מלא"
        className="flex size-7 items-center justify-center rounded-full text-primary transition active:scale-90 active:opacity-70"
      >
        <CalendarDays className="size-4" />
      </button>
    </div>
  );
}
