'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  HEBREW_MONTHS,
  toLocalDateString,
  firstDowOfMonth,
  daysInMonth,
} from '../_lib/calendar.utils';

// Single-letter Hebrew weekday labels, DOM order = Sunday first.
// RTL CSS grid places item 1 in the rightmost column, so ראשון (Sunday) is
// visually on the right — correct for the Israeli calendar convention.
const WEEKDAY_ABBR = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] as const;

interface Props {
  open: boolean;
  /** The currently active date in the main calendar — used for initial highlight & week stripe. */
  selectedDate: Date;
  timezone: string;
  /** Optional set of dates that have appointments — rendered as dots. */
  appointmentDates?: Date[];
  /** Called only when the user confirms with "בחר". */
  onSelectDate: (date: Date) => void;
  onClosed: () => void;
}

export function CalendarMonthPicker({
  open,
  selectedDate,
  timezone,
  appointmentDates = [],
  onSelectDate,
  onClosed,
}: Props) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  // pendingDate: the date the user has tapped but not yet confirmed.
  const [pendingDate, setPendingDate] = useState<Date>(selectedDate);

  // View month — reset to selectedDate's month each time the sheet opens.
  const [viewYear, setViewYear]   = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());

  useEffect(() => {
    if (!open) return;
    setPendingDate(selectedDate);
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  function handleConfirm() {
    onSelectDate(pendingDate);
    triggerClose();
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────

  const firstDow  = firstDowOfMonth(viewYear, viewMonth, timezone);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  function buildDayStr(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const todayStr   = toLocalDateString(new Date(), timezone);
  const pendingStr = toLocalDateString(pendingDate, timezone);

  // Appointment dot set.
  const apptSet = new Set(appointmentDates.map((d) => toLocalDateString(d, timezone)));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70" dir="rtl">
      {/* Backdrop — tapping it does NOT confirm; just cancels */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-4xl border-t border-border',
          'shadow-2xl shadow-foreground/20',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-extrabold text-foreground">לוח שנה</h2>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 pb-2">
          {/* Month navigation — tapping the month/year label jumps to current month */}
          <div className="mb-5 flex items-center justify-between px-1">
            <button
              onClick={prevMonth}
              aria-label="חודש קודם"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 active:bg-muted/60"
            >
              <ChevronRight className="size-5" />
            </button>

            <button
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
              }}
              className="text-[15px] font-bold text-foreground transition active:opacity-60"
            >
              {HEBREW_MONTHS[viewMonth]} {viewYear}
            </button>

            <button
              onClick={nextMonth}
              aria-label="חודש הבא"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 active:bg-muted/60"
            >
              <ChevronLeft className="size-5" />
            </button>
          </div>

          {/* Weekday header row */}
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAY_ABBR.map((abbr) => (
              <div key={abbr} className="flex h-7 items-center justify-center">
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {abbr}
                </span>
              </div>
            ))}
          </div>

          {/* Day cells grid — tapping selects pending date without closing */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;

              const ds        = buildDayStr(day);
              const isPending = ds === pendingStr;
              const isToday   = ds === todayStr;
              const hasAppt   = apptSet.has(ds);

              return (
                <div key={ds} className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => setPendingDate(new Date(Date.UTC(viewYear, viewMonth, day, 12)))}
                    className={[
                      'relative flex size-10 flex-col items-center justify-center rounded-full transition active:scale-95',
                      isPending
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                        : isToday
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground active:bg-muted/60',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'text-sm tabular-nums leading-none',
                        isPending || isToday ? 'font-bold' : 'font-medium',
                      ].join(' ')}
                    >
                      {day}
                    </span>

                    {hasAppt && (
                      <span
                        className={[
                          'absolute bottom-1.5 size-1 rounded-full',
                          isPending ? 'bg-primary-foreground/60' : 'bg-primary',
                        ].join(' ')}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer — confirm button */}
        <div className="mt-3 border-t border-border px-5 pb-8 pt-4">
          <button
            onClick={handleConfirm}
            className="flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98]"
          >
            בחר
          </button>
        </div>
      </div>
    </div>
  );
}
