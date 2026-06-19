'use client';

import { Building2, Check, X } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from './admin-header';
import { AdminBottomNav } from './admin-bottom-nav';
import { useAdminOnboardingSummary } from '../_hooks/use-admin-onboarding-summary';
import type { AdminOnboardingSummaryDto } from '@/lib/admin-api';

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

function StepIcon({ done }: { done: boolean }) {
  return (
    <div
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
        done
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-50 text-red-400 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {done ? (
        <Check size={13} strokeWidth={2.5} />
      ) : (
        <X size={13} strokeWidth={2.5} />
      )}
    </div>
  );
}

function StepCard({
  title,
  done,
  details,
}: {
  title: string;
  done: boolean;
  details: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <StepIcon done={done} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{details}</p>
      </div>
    </div>
  );
}

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
        <div className="animate-pulse space-y-3 py-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            >
              <div className="size-6 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}

function buildSteps(summary: AdminOnboardingSummaryDto) {
  const { business, users, services, serviceProviders, readiness } = summary;
  const { checks } = readiness;

  const activeOwner = users.find(
    (u) => u.role === 'OWNER' && u.status === 'ACTIVE',
  );
  const activeUsers = users.filter((u) => u.status === 'ACTIVE');
  const nonOwnerActive = activeUsers.filter((u) => u.role !== 'OWNER').length;
  const activeServices = services.filter((s) => s.isActive);
  const activeProviders = serviceProviders.filter((p) => p.isActive);

  const hoursOk =
    checks.hasBusinessWorkingHours && checks.allActiveProvidersHaveWorkingHours;

  const teamDetails = activeOwner
    ? `${activeOwner.user.email ?? activeOwner.user.phone}${nonOwnerActive > 0 ? ` · עוד ${nonOwnerActive}` : ''}`
    : 'טרם נוצר בעלים פעיל';

  const servicesDetails =
    activeServices.length === 0
      ? 'אין שירותים פעילים'
      : `${activeServices.length} שירות${activeServices.length === 1 ? '' : 'ים'} פעיל${activeServices.length === 1 ? '' : 'ים'}`;

  const providersDetails =
    activeProviders.length === 0
      ? 'אין יומנים פעילים'
      : `${activeProviders.length} יומן${activeProviders.length === 1 ? '' : 'ות'} פעיל${activeProviders.length === 1 ? '' : 'ות'}`;

  const hoursDetails = checks.hasBusinessWorkingHours
    ? checks.allActiveProvidersHaveWorkingHours
      ? 'שעות עסק וכל היומנים מוגדרים'
      : 'שעות עסק מוגדרות — חסרות שעות ביומן אחד או יותר'
    : 'שעות פעילות עסק לא הוגדרו';

  return [
    {
      title: 'פרטי עסק',
      done: true,
      details: `${business.name} · ${business.timezone}`,
    },
    {
      title: 'בעלים וצוות',
      done: checks.hasActiveOwner,
      details: teamDetails,
    },
    {
      title: 'שירותים',
      done: checks.hasActiveService,
      details: servicesDetails,
    },
    {
      title: 'יומנים',
      done: checks.hasActiveServiceProvider,
      details: providersDetails,
    },
    {
      title: 'שעות פעילות',
      done: hoursOk,
      details: hoursDetails,
    },
    {
      title: 'מוכנות לשימוש',
      done: readiness.isReady,
      details: readiness.isReady
        ? 'העסק מוכן לפתיחת גישה לדשבורד'
        : `${readiness.blockingReasons.length} פריט${readiness.blockingReasons.length === 1 ? '' : 'ים'} חסר${readiness.blockingReasons.length === 1 ? '' : 'ים'}`,
    },
  ];
}

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

  const { business, readiness } = summary;
  const statusCfg = STATUS_CONFIG[business.status] ?? {
    label: business.status,
    className: 'bg-gray-100 text-gray-500',
  };
  const steps = buildSteps(summary);

  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="הקמת עסק" subtitle={business.name} />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {/* Status + slug row */}
        <div className="mb-4 mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
          <span>@{business.slug}</span>
          <span>{business.timezone}</span>
        </div>

        {/* Step cards */}
        <div className="space-y-3">
          {steps.map((step) => (
            <StepCard
              key={step.title}
              title={step.title}
              done={step.done}
              details={step.details}
            />
          ))}
        </div>

        {/* Blocking reasons detail */}
        {!readiness.isReady && readiness.blockingReasons.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
            <p className="text-sm font-semibold text-foreground">פריטים חסרים:</p>
            <ul className="mt-2 space-y-1.5">
              {readiness.blockingReasons.map((reason) => (
                <li key={reason} className="text-xs text-muted-foreground">
                  · {localizeBlockingReason(reason)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Open dashboard access CTA — read-only in E.1, wired in E.4 */}
        <div className="mb-4 mt-6">
          <button
            type="button"
            disabled
            title={
              readiness.isReady
                ? 'יתאפשר בשלב E.4'
                : 'יש להשלים את כל הפריטים תחילה'
            }
            className="w-full cursor-not-allowed rounded-2xl py-4 text-sm font-semibold opacity-40 bg-foreground text-background"
          >
            פתח גישה לדשבורד
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {readiness.isReady
              ? 'הכפתור יופעל בשלב E.4 — העסק מוכן לפתיחה'
              : 'השלם את כל שלבי ההקמה תחילה'}
          </p>
        </div>
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
