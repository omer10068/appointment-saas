'use client';

import { getWeekDays, isSameDay, HEBREW_DAY_ABBR } from '../_lib/calendar-v2.utils';

interface Props {
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

export function CalendarV2DayPicker({ selectedDate, today, onSelect }: Props) {
  // getWeekDays returns Sun→Sat; with dir="rtl" inherited, Sunday renders rightmost
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-2 py-2 font-['Heebo']">
      <div className="flex justify-around">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={[
                'flex flex-col items-center justify-center w-10 h-12 rounded-xl transition-colors',
                isSelected
                  ? 'bg-[linear-gradient(145deg,#7FAEFF_0%,#4F8FF5_45%,#2F73D9_100%)] text-white'
                  : isToday
                    ? 'text-[#3F85DE] hover:bg-[#EEF5FF]'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              <span
                className={[
                  'text-[13px] leading-none mb-1 font-medium',
                  isSelected ? 'text-blue-100' : 'opacity-70',
                ].join(' ')}
              >
                {HEBREW_DAY_ABBR[day.getDay()]}
              </span>

              <span
                className={[
                  'text-base font-bold leading-none',
                  isToday && !isSelected ? 'font-extrabold' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
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