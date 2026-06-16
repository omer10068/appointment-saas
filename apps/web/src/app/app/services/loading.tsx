import { Scissors, Search } from 'lucide-react';
import { MobilePhoneFrame } from '../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../_components/calendar-bottom-nav';

function ServiceCardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="size-11 shrink-0 rounded-2xl bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3.5 w-32 rounded-lg bg-muted" />
        <div className="h-3 w-24 rounded-lg bg-muted" />
      </div>
      <div className="h-5 w-14 shrink-0 rounded-full bg-muted" />
    </div>
  );
}

export default function ServicesLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header — matches shell chrome exactly */}
      <div className="flex-none bg-background px-5 pb-4 pt-9">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              שירותים
            </h1>
            <div className="mt-1 h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Scissors className="size-5" />
          </div>
        </div>
        {/* Search bar — static chrome, pulsing input area */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground pointer-events-none" />
          <div className="h-4 flex-1 rounded bg-muted-foreground/20 animate-pulse" />
        </div>
      </div>

      {/* Service card skeletons — matches LoadingSkeleton in the shell */}
      <div className="flex-1 overflow-y-auto">
        <div className="animate-pulse space-y-2.5 px-5 pt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </div>

      <CalendarBottomNav activeKey="services" />
    </MobilePhoneFrame>
  );
}
