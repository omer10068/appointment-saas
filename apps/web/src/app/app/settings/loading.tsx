import { ChevronLeft, Settings } from 'lucide-react';
import { MobilePhoneFrame } from '../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../_components/calendar-bottom-nav';

export default function SettingsLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header — matches MobileSettingsHubShell header */}
      <header className="flex-none border-b border-border bg-card px-5 pb-5 pt-9">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3.5 w-28 animate-pulse rounded-full bg-primary/20" />
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              ניהול והגדרות
            </h1>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Settings className="size-5" />
          </div>
        </div>
      </header>

      {/* Settings item skeletons — mirrors the 4 static items in the hub */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-2">
        <div className="animate-pulse space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5"
            >
              <div className="size-10 shrink-0 rounded-full bg-muted" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3.5 w-32 rounded bg-muted" />
                <div className="h-3 w-44 rounded bg-muted" />
              </div>
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>

      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
