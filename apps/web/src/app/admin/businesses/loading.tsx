import { Building2 } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700" />
        </div>
        <div className="h-5 w-14 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 flex gap-4">
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function AdminBusinessesLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      <header className="flex-none bg-background px-5 pt-9 pb-5">
        <div className="flex animate-pulse items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Building2 className="size-5" />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="animate-pulse space-y-3 py-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
