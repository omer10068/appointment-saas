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
    <div className="flex items-center justify-between py-2">
      {/* First child → rightmost in RTL = previous week */}
      <button
        onClick={onPrevWeek}
        aria-label="שבוע קודם"
        className="p-2 rounded-xl text-muted-foreground transition active:scale-90"
      >
        <ChevronRight size={20} />
      </button>

      {/* Center: month/year + today pill */}
      <div className="flex flex-col items-center gap-0.5">
        <h1 className="text-[15px] font-semibold text-foreground leading-tight">
          {formatMonthYear(selectedDate)}
        </h1>
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
        className="p-2 rounded-xl text-muted-foreground transition active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}
