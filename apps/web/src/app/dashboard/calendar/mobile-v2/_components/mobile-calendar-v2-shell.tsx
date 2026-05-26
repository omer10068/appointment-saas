'use client';

import { useState } from 'react';
import { getMockAppointments } from '../_lib/calendar-v2.mock';
import { addDays } from '../_lib/calendar-v2.utils';
import { CalendarV2Header } from './calendar-v2-header';
import { CalendarV2DayPicker } from './calendar-v2-day-picker';
import { CalendarV2Timeline } from './calendar-v2-timeline';
import { CalendarV2NewButton } from './calendar-v2-new-button';
import { CalendarV2BottomNav } from './calendar-v2-bottom-nav';

export function MobileCalendarV2Shell() {
  const [today] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [todayResetKey, setTodayResetKey] = useState(0);

  const appointments = getMockAppointments(selectedDate);

  function handlePrevWeek() {
    setSelectedDate((d) => addDays(d, -7));
  }

  function handleNextWeek() {
    setSelectedDate((d) => addDays(d, 7));
  }

  function handleToday() {
    setSelectedDate(new Date());
    setTodayResetKey((key) => key + 1);
  }

  function handleEditAppointment(id: string) {
    // Placeholder — no modal yet
    console.log('[CalendarV2] edit appointment:', id);
  }

  function handleNewAppointment() {
    // Placeholder — no modal yet
    console.log('[CalendarV2] new appointment');
  }

  return (
    // Fixed full-screen overlay covering DashboardShell — preview only
    <div
      className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden"
      dir="rtl"
    >
      <CalendarV2Header
        selectedDate={selectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
      />

      <CalendarV2DayPicker
        selectedDate={selectedDate}
        today={today}
        onSelect={setSelectedDate}
      />

      <CalendarV2Timeline
        key={todayResetKey}
        selectedDate={selectedDate}
        appointments={appointments}
        onEditAppointment={handleEditAppointment}
      />

      <CalendarV2NewButton onClick={handleNewAppointment} />

      <CalendarV2BottomNav activeKey="calendar" />
    </div>
  );
}