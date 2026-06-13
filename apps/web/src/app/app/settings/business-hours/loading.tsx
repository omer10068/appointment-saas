import { ChevronRight } from 'lucide-react';
import { MobilePhoneFrame } from '../../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../../_components/calendar-bottom-nav';

export default function BusinessHoursLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header — matches MobileBusinessHoursShell header */}
      <header className="flex-none border-b border-border bg-card px-5 pb-4 pt-9">
        <button
          disabled
          className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground opacity-40"
        >
          <ChevronRight className="size-4" />
          <span>חזרה</span>
        </button>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="h-3.5 w-28 animate-pulse rounded-full bg-primary/20" />
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              שעות פעילות
            </h1>
          </div>
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      </header>

      {/* Section label */}
      <div className="flex-none px-5 pb-2">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Day row skeletons */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="animate-pulse space-y-3 pt-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted" />
          ))}
        </div>
      </div>

      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
