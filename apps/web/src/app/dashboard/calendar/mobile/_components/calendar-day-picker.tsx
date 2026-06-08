'use client';

import { getWeekDays, isSameDay, HEBREW_DAY_ABBR } from '../_lib/calendar.utils';

interface Props {
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

export function CalendarDayPicker({ selectedDate, today, onSelect }: Props) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="bg-transparent px-3 py-3">
      <div className="flex items-end justify-around">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday    = isSameDay(day, today);

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className="flex w-10 flex-col items-center gap-2 transition-colors"
            >
              <span
                className={[
                  'text-[12px] font-normal leading-none',
                  isSelected ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {HEBREW_DAY_ABBR[day.getDay()]}
              </span>

              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-[12px] leading-none transition-all',
                  isSelected
                    ? 'bg-foreground text-background shadow-sm'
                    : isToday
                      ? 'text-primary font-semibold'
                      : 'bg-transparent text-foreground',
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
