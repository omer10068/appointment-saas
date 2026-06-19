import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from '@/app/admin/_components/admin-header';
import { AdminBottomNav } from '@/app/admin/_components/admin-bottom-nav';

const ONBOARDING_SECTIONS = [
  { id: 'business',   title: 'פרטי עסק',        description: 'שם, אזור זמן, לוקאל, מטבע' },
  { id: 'team',       title: 'בעלים וצוות',      description: 'יצירת בעלים ומנהלים' },
  { id: 'services',   title: 'שירותים',           description: 'הגדרת שירותים פעילים' },
  { id: 'providers',  title: 'יומנים',            description: 'הגדרת ספקי שירות' },
  { id: 'hours',      title: 'שעות פעילות',       description: 'שעות עסק ויומנים' },
  { id: 'readiness',  title: 'מוכנות להפעלה',    description: 'בדיקת תנאים לפתיחה' },
] as const;

export default async function AdminOnboardingPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="הקמת עסק" subtitle={`מזהה: ${businessId}`} />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="space-y-3 py-4">
          {ONBOARDING_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            >
              <p className="font-semibold text-foreground">{section.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
              <p className="mt-2 text-xs text-muted-foreground/60">בקרוב</p>
            </div>
          ))}
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
