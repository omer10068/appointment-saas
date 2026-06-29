import { Settings } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from '@/app/admin/_components/admin-header';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

export default function AdminSettingsPage() {
  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="מערכת" subtitle="הגדרות תפעוליות פנימיות" />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Settings className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">הגדרות מערכת</p>
            <p className="mt-1 text-sm text-muted-foreground">בקרוב</p>
          </div>
        </div>
      </div>
      <AdminBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
