import { Building2 } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from '@/app/admin/_components/admin-header';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

export default function AdminBusinessesPage() {
  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="עסקים" subtitle="ניהול עסקים ותהליכי הקמה" />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              כאן ננהל עסקים ונפתח תהליך הקמה
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              רשימת עסקים תופיע כאן
            </p>
          </div>
          <button
            type="button"
            disabled
            className="mt-2 cursor-not-allowed rounded-xl bg-muted px-5 py-2 text-sm font-medium text-muted-foreground opacity-50"
          >
            + עסק חדש
          </button>
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
