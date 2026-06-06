'use client';

import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { useTodayAppointments } from '../_hooks/use-today-appointments';
import { formatDate } from '../_lib/calendar.utils';
import { LAYOUT } from '../_lib/calendar.design';

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  valueClass?: string;
}

function SummaryCard({ label, value, valueClass = 'text-gray-900 dark:text-gray-100' }: SummaryCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-gray-900 rounded-2xl py-4 px-2 shadow-sm border border-gray-100 dark:border-gray-800">
      <span className={`text-[28px] font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-900 rounded-2xl py-4 px-2 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="h-7 w-8 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileHomeShell() {
  const { currentBusiness } = useDashboardBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const timezone     = currentBusiness?.business.timezone;

  const { summary, loading, error, retry } = useTodayAppointments(businessId, timezone);

  const todayLabel = formatDate(new Date(), timezone ?? 'UTC');

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col overflow-hidden',
        'bg-gray-50 dark:bg-gray-950',
        'md:inset-auto md:top-1/2 md:left-1/2',
        'md:-translate-x-1/2 md:-translate-y-1/2',
        'md:w-107.5 md:h-[90dvh]',
        'md:rounded-4xl md:shadow-2xl md:overflow-hidden',
      ].join(' ')}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {businessName && (
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
            {businessName}
          </p>
        )}
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 leading-tight">
          דף הבית
        </h1>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">{todayLabel}</p>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-5"
        style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 16 }}
      >
        {loading ? (
          <div className="flex gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[14px] text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={retry}
              className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
            >
              נסה שוב
            </button>
          </div>
        ) : !summary || summary.totalToday === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-gray-400 dark:text-gray-500">אין תורים היום</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <SummaryCard
              label="סה״כ תורים היום"
              value={summary.totalToday}
            />
            <SummaryCard
              label="נותרו היום"
              value={summary.remainingToday}
              valueClass="text-blue-600 dark:text-blue-400"
            />
            <SummaryCard
              label="הושלמו"
              value={summary.completedToday}
              valueClass="text-green-600 dark:text-green-400"
            />
          </div>
        )}
      </div>

      <CalendarBottomNav activeKey="home" />
    </div>
  );
}
