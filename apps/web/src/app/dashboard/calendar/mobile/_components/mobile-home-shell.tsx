'use client';

import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import { CalendarBottomNav } from './calendar-bottom-nav';

export function MobileHomeShell() {
  const { currentBusiness } = useDashboardBusiness();
  const businessName = currentBusiness?.business.name;

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
      {/* Header — placeholder for Phase B */}
      <div className="flex-none px-6 pt-5 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {businessName && (
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
            {businessName}
          </p>
        )}
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 leading-tight">
          דף הבית
        </h1>
      </div>

      {/* Content area — data/cards arrive in Phase B and C */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px] text-gray-400 dark:text-gray-500">בקרוב</p>
      </div>

      <CalendarBottomNav activeKey="home" />
    </div>
  );
}
