'use client';

import { Clock, Pencil } from 'lucide-react';

interface Props {
  customerName: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  serviceProviderName?: string;
  note?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  compact?: boolean;
  onEdit?: () => void;
}

const colorStyles = {
  mint: {
    bg: 'bg-[#e8f5e9]',
    accent: 'bg-[#4caf50]',
    text: 'text-[#2e7d32]',
  },
  peach: {
    bg: 'bg-[#fff3e0]',
    accent: 'bg-[#ff9800]',
    text: 'text-[#e65100]',
  },
  lavender: {
    bg: 'bg-[#f3e5f5]',
    accent: 'bg-[#9c27b0]',
    text: 'text-[#7b1fa2]',
  },
  rose: {
    bg: 'bg-[#fce4ec]',
    accent: 'bg-[#e91e63]',
    text: 'text-[#c2185b]',
  },
} as const;

function getCardColor(serviceName: string): keyof typeof colorStyles {
  if (serviceName.includes('תספורת וצבע')) return 'mint';
  if (serviceName.includes('טיפול פנים')) return 'peach';
  if (serviceName.includes('תספורת גבר')) return 'lavender';
  if (serviceName.includes('גבות')) return 'rose';

  return 'mint';
}

export function CalendarV2AppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceName,
  serviceProviderName,
  status,
  compact = false,
  onEdit,
}: Props) {
  const styles = colorStyles[getCardColor(serviceName)];

  if (compact) {
    return (
      <div
        className={`${styles.bg} rounded-e-xl p-2 sm:p-2.5 w-full h-full relative overflow-hidden transition-all duration-200 hover:shadow-md`}
        dir="rtl"
      >
        {/* Accent bar */}
        <div className={`absolute top-0 right-0 w-1 h-full ${styles.accent}`} />

        {/* Compact Content - single row */}
        <div className="pr-2 flex h-full items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
              {serviceName}
            </h3>

            <span className="text-gray-900 text-xs sm:text-sm truncate">
              {customerName}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <Clock className={`w-3 h-3 ${styles.text}`} />
              <span className={`text-xs ${styles.text} tabular-nums`}>
                {startTime} - {endTime}
              </span>
            </div>
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              aria-label="עריכה"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.bg} rounded-e-2xl p-2 sm:p-4 w-full h-full relative overflow-hidden transition-all duration-200 hover:shadow-md`}
      dir="rtl"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 right-0 w-1 sm:w-1.5 h-full ${styles.accent}`} />

      {/* Content */}
      <div className="h-full sm:pr-2 flex flex-col justify-between">

        <div className="h-full sm:pr-2 flex flex-row-reverse justify-between">
          {/* Edit button + Service Provider name */}
          <div className="h-full sm:pr-2 flex flex-col justify-between">
            <div className="flex flex-row justify-end w-full">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-sm shrink-0"
                  aria-label="עריכה"
                >
                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </button>
              )}
            </div>

            {serviceProviderName && (
              <span className="text-xs sm:text-sm text-gray-400 truncate">
                {serviceProviderName}
              </span>
            )}
          </div>
          {/* Service name + Customer name */}
          <div className="pr-2 h-full sm:pr-2 flex flex-col justify-between">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {serviceName}
            </h3>

            <p className="text-gray-800 text-xs sm:text-base mb-1 truncate">
              {customerName}
            </p>

            {/* Time & Therapist row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${styles.text}`} />
                <span className={`text-xs sm:text-sm font-medium ${styles.text} tabular-nums`}>
                  {startTime} - {endTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>



    </div>
  );
}