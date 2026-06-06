'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HEBREW_MONTHS,
  toLocalDateString,
  firstDowOfMonth,
  daysInMonth,
  todayInTimezone,
} from '../_lib/calendar.utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendarDatePickerProps {
  selectedDate: Date;
  timezone: string;
  onSelect: (date: Date) => void;
}

// Weekday header labels — DOM order [ראשון…שבת].
// RTL CSS grid places item 1 in the rightmost column, so ראשון (Sunday) appears
// on the right (Hebrew calendar start) and שבת on the left. Correct for IL locale.
const WEEKDAY_HEADERS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarDatePicker({ selectedDate, timezone, onSelect }: CalendarDatePickerProps) {
  const todayStr = toLocalDateString(new Date(), timezone);
  const { year: todayYear, month: todayMonth } = todayInTimezone(timezone);
  const selectedStr = toLocalDateString(selectedDate, timezone);

  // Derive which month to open on: the month of selectedDate, or today's month
  // if selectedDate is in the past.
  const [viewYear, setViewYear] = useState<number>(() => {
    const s = toLocalDateString(selectedDate, timezone);
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7)) - 1; // 0-based
    return y > todayYear || (y === todayYear && m >= todayMonth) ? y : todayYear;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const s = toLocalDateString(selectedDate, timezone);
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7)) - 1;
    return y > todayYear || (y === todayYear && m >= todayMonth) ? m : todayMonth;
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canGoPrev =
    viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth);

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // ── Grid computation ────────────────────────────────────────────────────────

  const firstDow = firstDowOfMonth(viewYear, viewMonth, timezone);
  const totalDays = daysInMonth(viewYear, viewMonth);

  // Prepend firstDow empty slots so day 1 lands in its correct weekday column.
  // RTL CSS grid: slot 1 → rightmost column (Sunday). firstDow empty slots
  // push day 1 to the correct weekday column automatically.
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function buildDayStr(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function handleDayClick(day: number) {
    const ds = buildDayStr(day);
    if (ds < todayStr) return; // past date — disabled
    // UTC noon on the selected calendar day: safe across all ±12 h timezones.
    // toLocalDateString(result, timezone) → "YYYY-MM-DD" matching the selected day.
    onSelect(new Date(Date.UTC(viewYear, viewMonth, day, 12)));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 select-none">

      {/* Month navigation header */}
      <div className="flex items-center justify-between px-1">
        {/* RTL: ChevronRight is on the visual right → previous month */}
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="חודש קודם"
          className={[
            'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
            canGoPrev
              ? 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              : 'text-gray-200 dark:text-gray-700 cursor-not-allowed',
          ].join(' ')}
        >
          <ChevronRight size={17} />
        </button>

        <span className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 leading-tight">
          {HEBREW_MONTHS[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="חודש הבא"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={17} />
        </button>
      </div>

      {/* Weekday header row */}
      <div className="grid grid-cols-7">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center py-1"
          >
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 leading-none">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const ds = buildDayStr(day);
          const isPast = ds < todayStr;
          const isSelected = ds === selectedStr;
          const isToday = ds === todayStr;

          return (
            <div key={ds} className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isPast}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center',
                  'text-[14px] font-medium transition-all duration-100',
                  isPast
                    ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#2d2d3a] text-white shadow-sm'
                    : isToday
                    ? 'text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-200 dark:ring-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
