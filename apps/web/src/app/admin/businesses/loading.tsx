import { Building2 } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

export default function AdminBusinessesLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      <header className="flex-none bg-background px-5 pt-9 pb-5">
        <div className="flex items-start justify-between">
          <div className="animate-pulse">
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-1.5 h-3 w-36 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Building2 className="size-5" />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="animate-pulse space-y-3 py-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            >
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 w-20 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
