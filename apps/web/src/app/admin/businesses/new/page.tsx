import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from '@/app/admin/_components/admin-header';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

export default function AdminNewBusinessPage() {
  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="עסק חדש" subtitle="הקמה מודרכת" />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">הקמה מודרכת בקרוב</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              בשלב הבא ניצור עסק חדש דרך טופס מודרך שלב אחר שלב
            </p>
          </div>
          <Link
            href="/admin/businesses"
            className="mt-2 rounded-xl border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors active:bg-muted"
          >
            חזרה לרשימה
          </Link>
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
