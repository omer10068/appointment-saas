'use client';

import { getWeekDays, isSameDay, HEBREW_DAY_ABBR } from '../_lib/calendar-v2.utils';

interface Props {
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

export function CalendarV2DayPicker({ selectedDate, today, onSelect }: Props) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="bg-transparent px-3 py-3">
      <div className="flex items-end justify-around">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className="flex w-10 flex-col items-center gap-2 transition-colors"
            >
              <span
                className={[
                  'text-[12px] font-normal leading-none',
                  isSelected ? 'text-[#2d2d3a]' : 'text-gray-400',
                ].join(' ')}
              >
                {HEBREW_DAY_ABBR[day.getDay()]}
              </span>

              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-[12px] leading-none transition-all',
                  isSelected
                    ? 'bg-[#2d2d3a] text-white shadow-sm'
                    : isToday
                      ? 'text-[#2d2d3a] font-weight-semibold'
                      : 'bg-transparent text-gray-800 pointer-cursor-default',
                ].join(' ')}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}