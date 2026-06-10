'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { formatMonthYear, isCurrentWeek } from '../_lib/calendar.utils';

interface Props {
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function CalendarHeader({ selectedDate, onPrevWeek, onNextWeek, onToday }: Props) {
  const showToday = !isCurrentWeek(selectedDate);

  return (
    // dir="rtl" is inherited from the shell — ChevronRight (→) is on the right = prev week
    <div className="flex items-center justify-between px-1 pb-2.5">
      {/* First child → rightmost in RTL = previous week */}
      <button
        onClick={onPrevWeek}
        aria-label="שבוע קודם"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Center: month/year + today pill */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-bold text-foreground">
          {formatMonthYear(selectedDate)}
        </span>
        {showToday && (
          <button
            onClick={onToday}
            className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full transition active:opacity-60"
          >
            היום
          </button>
        )}
      </div>

      {/* Last child → leftmost in RTL = next week */}
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
