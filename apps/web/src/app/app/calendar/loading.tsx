import { Calendar } from 'lucide-react';
import { MobilePhoneFrame } from '../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../_components/calendar-bottom-nav';

export default function CalendarLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      {/* Page header — matches shell chrome exactly */}
      <div className="flex-none border-b border-border bg-card px-5 pb-4 pt-9">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              יומן
            </h1>
            <div className="mt-1 h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Calendar className="size-5" />
          </div>
        </div>
      </div>

      {/* Week strip — matches CalendarHeader + CalendarDayPicker chrome */}
      <div className="flex-none border-b border-border bg-card px-3 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="flex justify-between gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="h-3 w-5 rounded bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="animate-pulse space-y-3 px-3 pt-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-10 shrink-0 rounded bg-muted" />
              <div className="h-10 flex-1 rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <CalendarBottomNav activeKey="calendar" />
    </MobilePhoneFrame>
  );
}
