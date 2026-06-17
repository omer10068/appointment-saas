'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getWeekDays, isSameDay, HEBREW_DAY_ABBR } from '../_lib/calendar.utils';

interface Props {
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function CalendarDayPicker({ selectedDate, today, onSelect, onPrevWeek, onNextWeek }: Props) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="flex items-center gap-0.5 px-2">
      {/* Right edge in RTL — previous week */}
      <button
        onClick={onPrevWeek}
        aria-label="שבוע קודם"
        className="ml-2 flex size-5.5 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted-foreground/70 transition active:scale-95 active:bg-muted bg-gray-100"
      >
        <ChevronRight className="size-3" />
      </button>

      {/* Week days */}
      <div className="flex flex-1 gap-1">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              className={[
                'flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-2 transition',
                isSelected ? 'bg-primary/10' : 'active:bg-muted/60',
              ].join(' ')}
            >
              <span
                className={[
                  'text-[10px] font-semibold leading-none',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                ].join(' ')}
              >
                {HEBREW_DAY_ABBR[day.getDay()]}
              </span>

              <span
                className={[
                  'flex size-8 items-center justify-center rounded-full text-sm font-bold tabular-nums transition',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : isToday
                      ? 'text-primary'
                      : 'text-foreground',
                ].join(' ')}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Left edge in RTL — next week */}
      <button
        onClick={onNextWeek}
        aria-label="שבוע הבא"
        className="mr-2 flex size-5.5 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted-foreground/70 transition active:scale-95 active:bg-muted bg-gray-100"
      >
        <ChevronLeft className="size-3" />
      </button>
    </div>
  );
}
