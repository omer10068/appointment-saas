'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { formatMonthYear, isCurrentWeek } from '../_lib/calendar-v2.utils';

interface Props {
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function CalendarV2Header({ selectedDate, onPrevWeek, onNextWeek, onToday }: Props) {
  const showToday = !isCurrentWeek(selectedDate);

  return (
    // dir="rtl" is inherited from the shell — ChevronRight (→) is on the right = prev week
    <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      {/* First child → rightmost in RTL = previous week */}
      <button
        onClick={onPrevWeek}
        aria-label="שבוע קודם"
        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      {/* Center: month/year + today pill */}
      <div className="flex flex-col items-center gap-0.5">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {formatMonthYear(selectedDate)}
        </h1>
        {showToday && (
          <button
            onClick={onToday}
            className="text-[11px] text-blue-600 font-medium px-2.5 py-0.5 rounded-full hover:bg-blue-50 transition-colors"
          >
            היום
          </button>
        )}
      </div>

      {/* Last child → leftmost in RTL = next week */}
      <button
        onClick={onNextWeek}
        aria-label="שבוע הבא"
        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}
