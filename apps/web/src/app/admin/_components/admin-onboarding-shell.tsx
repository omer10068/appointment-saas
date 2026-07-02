'use client';

import { Building2, Check, X } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from './admin-header';
import { AdminBottomNav } from './admin-bottom-nav';
import { useAdminOnboardingSummary } from '../_hooks/use-admin-onboarding-summary';
import { ManagersSection } from './admin-onboarding-managers-section';
import { ServicesSection } from './admin-onboarding-services-section';
import { ProvidersSection } from './admin-onboarding-providers-section';
import { BusinessHoursSection } from './admin-onboarding-business-hours-section';
import { ProviderHoursSection } from './admin-onboarding-provider-hours-section';
import { LifecycleSection } from './admin-onboarding-lifecycle-section';
import type { AdminOnboardingSummaryDto } from '@/lib/admin-api';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'טיוטה',  className: 'bg-gray-100 text-gray-600' },
  TRIAL:     { label: 'ניסיון', className: 'bg-blue-50 text-blue-600' },
  ACTIVE:    { label: 'פעיל',   className: 'bg-green-50 text-green-600' },
  SUSPENDED: { label: 'מושהה',  className: 'bg-red-50 text-red-500' },
  CANCELLED: { label: 'מבוטל', className: 'bg-gray-100 text-gray-400' },
};

const BLOCKING_REASON_HE: Record<string, string> = {
  'No active owner':
    'חסר בעלים פעיל',
  'No active service':
    'חסר שירות פעיל',
  'No active service provider':
    'חסר יומן (ספק שירות) פעיל',
  'No business working hours configured':
    'שעות פעילות עסק לא הוגדרו',
  'One or more active service providers have no working hours':
    'יומן אחד או יותר ללא שעות פעילות',
  'One or more active service providers have no active service assignment':
    'יומן אחד או יותר ללא שירות מוקצה',
  'One or more active services have no active service provider assignment':
    'שירות אחד או יותר ללא יומן מוקצה',
};

function localizeBlockingReason(reason: string): string {
  return BLOCKING_REASON_HE[reason] ?? reason;
}

// ─── Summary step row ─────────────────────────────────────────────────────────

function StepIcon({ done }: { done: boolean }) {
  return (
    <div
      className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
        done ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'
      }`}
    >
      {done ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />}
    </div>
  );
}

function SummaryRow({
  title,
  done,
  details,
}: {
  title: string;
  done: boolean;
  details: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <StepIcon done={done} />
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{details}</span>
    </div>
  );
}

function buildSummaryRows(summary: AdminOnboardingSummaryDto) {
  const { users, services, serviceProviders, businessWorkingHours, readiness } = summary;
  const { checks } = readiness;

  const owner = users.find((u) => u.role === 'OWNER');
  const managers = users.filter((u) => u.role === 'MANAGER' && u.status === 'ACTIVE');
  const activeServices = services.filter((s) => s.isActive);
  const activeProviders = serviceProviders.filter((p) => p.isActive);

  return [
    {
      title: 'בעלים',
      done: checks.hasActiveOwner,
      details: !owner
        ? '—'
        : owner.status === 'ACTIVE'
          ? (owner.user.email ?? owner.user.phone)
          : 'הזמנה ממתינה',
    },
    {
      title: 'מנהלים',
      done: managers.length > 0,
      details: managers.length > 0 ? `${managers.length}` : '—',
    },
    {
      title: 'שירותים',
      done: checks.hasActiveService,
      details: activeServices.length > 0 ? `${activeServices.length}` : '—',
    },
    {
      title: 'יומנים',
      done: checks.hasActiveServiceProvider,
      details: activeProviders.length > 0 ? `${activeProviders.length}` : '—',
    },
    {
      title: 'שעות עסק',
      done: checks.hasBusinessWorkingHours,
      details: businessWorkingHours.length > 0 ? 'מוגדרות' : '—',
    },
    {
      title: 'שעות יומנים',
      done: checks.allActiveProvidersHaveWorkingHours,
      details: checks.allActiveProvidersHaveWorkingHours ? 'מוגדרות' : '—',
    },
    {
      title: 'מוכנות לשימוש',
      done: readiness.isReady,
      details: readiness.isReady ? '✓' : `${readiness.blockingReasons.length} חסר`,
    },
  ];
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <MobilePhoneFrame dir="rtl">
      <header className="flex-none bg-background px-5 pt-9 pb-5">
        <div className="flex animate-pulse items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent ring-1 ring-primary/10">
            <Building2 className="size-5 text-accent-foreground" />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        <div className="animate-pulse space-y-2 py-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <div className="size-5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-8 shrink-0 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

// ─── Owner section (read-only) ────────────────────────────────────────────────

function OwnerSection({ users }: { users: AdminOnboardingSummaryDto['users'] }) {
  const owner = users.find((u) => u.role === 'OWNER');
  if (!owner) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        בעלים ראשי טרם נוצר
      </div>
    );
  }
  const isActive = owner.status === 'ACTIVE';
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {owner.user.email ?? owner.user.phone}
          </p>
          {owner.user.email && (
            <p className="mt-0.5 text-xs text-muted-foreground">{owner.user.phone}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isActive ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {isActive ? 'בעלים · פעיל' : 'בעלים · הזמנה נשלחה'}
        </span>
      </div>
      {!isActive && (
        <p className="mt-1.5 text-xs text-amber-600">ממתין לאישור ההזמנה על ידי הבעלים</p>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        כניסה: {owner.user.email ?? '—'} (Clerk)
      </p>
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

interface Props {
  businessId: string;
}

export function AdminOnboardingShell({ businessId }: Props) {
  const { summary, loading, error, refetch } = useAdminOnboardingSummary(businessId);

  if (loading) return <LoadingSkeleton />;

  if (error || !summary) {
    return (
      <MobilePhoneFrame dir="rtl">
        <AdminHeader title="הקמת עסק" />
        <div className="flex-1 overflow-y-auto px-5 pb-36">
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="font-semibold text-foreground">שגיאה בטעינת פרטי ההקמה</p>
            <button
              type="button"
              onClick={refetch}
              className="rounded-xl bg-foreground px-5 py-2 text-sm font-medium text-background"
            >
              נסה שוב
            </button>
          </div>
        </div>
        <AdminBottomNav activeKey="businesses" />
      </MobilePhoneFrame>
    );
  }

  const { business, users, services, serviceProviders, businessWorkingHours, readiness } =
    summary;
  const statusCfg = STATUS_CONFIG[business.status] ?? {
    label: business.status,
    className: 'bg-gray-100 text-gray-500',
  };
  const summaryRows = buildSummaryRows(summary);

  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="הקמת עסק" subtitle={business.name} />
      <div className="flex-1 overflow-y-auto px-5 pb-36">

        {/* Status + meta row */}
        <div className="mb-4 mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
          <span>@{business.slug}</span>
          <span>{business.timezone}</span>
        </div>

        {/* At-a-glance summary */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">מצב הקמה</p>
          <div className="divide-y divide-border">
            {summaryRows.map((row) => (
              <SummaryRow
                key={row.title}
                title={row.title}
                done={row.done}
                details={row.details}
              />
            ))}
          </div>
        </div>

        {/* Blocking reasons */}
        {!readiness.isReady && readiness.blockingReasons.length > 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-foreground">פריטים חסרים:</p>
            <ul className="mt-1.5 space-y-1">
              {readiness.blockingReasons.map((reason) => (
                <li key={reason} className="text-xs text-muted-foreground">
                  · {localizeBlockingReason(reason)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ══ SETUP SECTIONS ══ */}

        <SectionDivider title="בעלים" />
        <OwnerSection users={users} />

        <SectionDivider title="מנהלים" />
        <ManagersSection businessId={businessId} users={users} />

        <SectionDivider title="שירותים" />
        <ServicesSection businessId={businessId} services={services} />

        <SectionDivider title="יומנים" />
        <ProvidersSection
          businessId={businessId}
          users={users}
          services={services}
          serviceProviders={serviceProviders}
        />

        <SectionDivider title="שעות פעילות עסק" />
        <BusinessHoursSection
          businessId={businessId}
          businessWorkingHours={businessWorkingHours}
        />

        <SectionDivider title="שעות ספקי שירות" />
        <ProviderHoursSection
          businessId={businessId}
          serviceProviders={serviceProviders}
          businessWorkingHours={businessWorkingHours}
        />

        <SectionDivider title="פתיחת גישה לדשבורד" />
        <LifecycleSection businessId={businessId} summary={summary} />

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
