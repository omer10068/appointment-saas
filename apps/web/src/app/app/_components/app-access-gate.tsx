'use client';

import { Ban, Building2, Clock3, Lock } from 'lucide-react';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { MobilePageHeader } from './mobile-page-header';
import { AppAccessStateCard } from './app-access-state-card';
import { resolveAppAccessState } from './app-access-gate.logic';

interface Props {
  children: React.ReactNode;
}

/**
 * Shared access-state gate for every route under /app/*. Mounted once in
 * app/layout.tsx so it applies consistently regardless of whether the user
 * enters through /app/home or deep-links directly into another /app route —
 * when access isn't valid, children (the actual page shell, its data hooks,
 * bottom nav, FAB, etc.) are never mounted at all.
 *
 * This is a UX/consistency layer only. Backend guards (assertAccess /
 * assertOwnerAccess / assertMutationAccess) remain the sole authorization
 * authority — this gate cannot be relied on for security, only for not
 * showing a broken/empty dashboard when the backend would reject anyway.
 */
export function AppAccessGate({ children }: Props) {
  const { currentBusiness } = useBusiness();
  const state = resolveAppAccessState(currentBusiness);

  switch (state) {
    case 'no-access':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Building2}
            heading="אין לך גישה לעסק"
            subtext="לא נמצאה עבורך הרשאה לניהול עסק במערכת. פנה/י למנהל המערכת אם לדעתך זו טעות."
          />
        </GateShell>
      );
    case 'invited':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Clock3}
            heading="ההזמנה שלך ממתינה להשלמה"
            subtext='קיבלת הזמנה להצטרף לעסק, אך התהליך טרם הושלם. בדוק/י את תיבת הדוא"ל שלך להשלמת ההרשמה.'
          />
        </GateShell>
      );
    case 'inactive':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Lock}
            heading="הגישה שלך אינה זמינה"
            subtext="הגישה שלך לעסק זה הושבתה. פנה/י למנהל העסק לפרטים נוספים."
          />
        </GateShell>
      );
    case 'draft':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Clock3}
            heading={currentBusiness?.business.name ?? ''}
            subtext="הגישה שלך אושרה, והעסק עדיין בהקמה."
          />
        </GateShell>
      );
    case 'suspended':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Ban}
            heading="העסק מושהה"
            subtext="הגישה לעסק זה הושהתה זמנית. פנה/י לתמיכה לפרטים נוספים."
          />
        </GateShell>
      );
    case 'cancelled':
      return (
        <GateShell>
          <AppAccessStateCard
            icon={Ban}
            heading="העסק אינו פעיל עוד"
            subtext="עסק זה בוטל ואינו זמין יותר."
          />
        </GateShell>
      );
    case 'active':
      return <>{children}</>;
  }
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePhoneFrame dir="rtl">
      <MobilePageHeader
        title="גישה למערכת"
        icon={Building2}
        className="flex-none bg-background px-5 pt-9 pb-5"
      />
      <div className="flex flex-1 items-center overflow-y-auto px-5 pb-10">
        {children}
      </div>
    </MobilePhoneFrame>
  );
}
