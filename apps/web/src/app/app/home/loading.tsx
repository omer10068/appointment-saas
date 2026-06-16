import { Home } from 'lucide-react';
import { MobilePhoneFrame } from '../_components/mobile-phone-frame';
import { CalendarBottomNav } from '../_components/calendar-bottom-nav';

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-4 shadow-sm">
      <div className="h-7 w-8 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-1 h-3 w-14 rounded bg-gray-100 dark:bg-gray-700" />
    </div>
  );
}

export default function HomeLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      <header className="flex-none bg-background px-5 pt-9 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              דף הבית
            </h1>
            <div className="mt-1.5 h-3 w-28 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Home className="size-5" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="animate-pulse space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="h-44 rounded-3xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="h-5 w-10 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-8 w-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-700" />
                </div>
                <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <CalendarBottomNav activeKey="home" />
    </MobilePhoneFrame>
  );
}
