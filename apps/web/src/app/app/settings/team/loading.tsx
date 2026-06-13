import { ChevronRight, Search } from 'lucide-react';
import { MobilePhoneFrame } from '../../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../../_components/calendar-bottom-nav';

export default function TeamLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header — matches MobileTeamShell header */}
      <div className="flex-none border-b border-border bg-card px-5 pb-4 pt-9">
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
              צוות
            </h1>
            <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
        {/* Search bar skeleton */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground pointer-events-none" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </div>

      {/* Provider card skeletons */}
      <div className="flex-1 overflow-y-auto">
        <div className="animate-pulse space-y-2.5 px-5 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4"
            >
              <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded-full bg-muted" />
                <div className="h-3 w-20 rounded-full bg-muted" />
              </div>
              <div className="h-5 w-14 shrink-0 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
