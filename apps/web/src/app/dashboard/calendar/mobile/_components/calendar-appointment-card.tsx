'use client';

import { SERVICE_COLORS } from '../_lib/calendar.design';
import type { AppointmentStatus, ServiceColor } from '../_lib/calendar.types';

interface CardSize {
  width: number;
  height: number;
}

interface Props {
  customerName: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  color: ServiceColor;
  status: AppointmentStatus;
  serviceProviderName?: string;
  note?: string;
  cardSize: CardSize;
  onClick?: () => void;
}

// ─── Status badge config ──────────────────────────────────────────────────────

// SCHEDULED and CONFIRMED need no badge — they are the "default" state.
const BADGE_LABEL: Partial<Record<AppointmentStatus, string>> = {
  completed:             'הושלם',
  no_show:               'לא הגיע',
  cancelled_by_customer: 'בוטל',
  cancelled_by_business: 'בוטל',
};

// Semi-transparent so the badge reads on any service colour without clashing.
const BADGE_CLASS: Partial<Record<AppointmentStatus, string>> = {
  completed:             'bg-black/10 text-black/55',
  no_show:               'bg-black/20 text-black/65',
  cancelled_by_customer: 'bg-black/12 text-black/50',
  cancelled_by_business: 'bg-black/12 text-black/50',
};

// Terminal appointments are visually softened so they read as "done / inactive".
const TERMINAL_OPACITY: Partial<Record<AppointmentStatus, string>> = {
  completed:             'opacity-75',
  no_show:               'opacity-70',
  cancelled_by_customer: 'opacity-60',
  cancelled_by_business: 'opacity-60',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarAppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceName,
  color,
  status,
  serviceProviderName,
  cardSize,
  onClick,
}: Props) {
  const c = SERVICE_COLORS[color];
  const isCompact    = cardSize.height > 34 && cardSize.height < 56;
  const isTiny       = cardSize.height <= 34;
  const isExtraTiny  = cardSize.height <= 27;

  const badgeLabel = BADGE_LABEL[status];
  const badgeClass = BADGE_CLASS[status] ?? '';
  const opacityClass = TERMINAL_OPACITY[status] ?? '';

  const interactiveClass = onClick ? 'cursor-pointer active:brightness-95' : '';

  // ── Tiny / ExtraTiny ─────────────────────────────────────────────────────
  if (isTiny || isExtraTiny) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`${c.bg} ${opacityClass} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200 ${interactiveClass}`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />
        <div className="h-full w-full min-w-0 pr-4 pl-3 flex flex-col justify-between py-0.75">
          <div className={`h-full w-full flex flex-row ${isExtraTiny ? 'items-center' : 'items-end'} justify-between`}>
            <div className="h-full flex flex-col justify-center items-start">
              <span className={`text-[${isExtraTiny ? '10px' : '11px'}] align-middle font-semibold ${c.customerText}`}>
                {serviceName}
              </span>
              {!isExtraTiny && (
                <span className={`text-[10.5px] font-medium leading-[1.15] truncate ${c.serviceText}`}>
                  {customerName}
                </span>
              )}
            </div>
            <span
              className={`shrink-0 whitespace-nowrap tabular-nums text-[10px] font-semibold leading-none ${c.metaText}`}
              dir="ltr"
            >
              {startTime} – {endTime}
            </span>
          </div>
        </div>
        {/* No badge on tiny cards — no room */}
      </div>
    );
  }

  // ── Compact ──────────────────────────────────────────────────────────────
  if (isCompact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`${c.bg} ${opacityClass} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200 ${interactiveClass}`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />
        <div className="h-full w-full min-w-0 pr-4 pl-2.5 flex flex-col justify-between py-1">
          <span className={`text-[12px] font-semibold leading-[1.15] truncate ${c.customerText}`}>
            {serviceName}
          </span>
          <span className={`text-[11px] font-medium leading-[1.15] truncate ${c.serviceText}`}>
            {customerName}
          </span>
          <div className="min-w-0 flex items-center justify-between gap-1.5">
            <span
              className={`shrink-0 whitespace-nowrap tabular-nums text-[10px] font-semibold leading-none ${c.metaText}`}
              dir="ltr"
            >
              {startTime} – {endTime}
            </span>
            {badgeLabel && (
              <span className={`shrink-0 text-[9px] font-medium leading-none px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                {badgeLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Regular ──────────────────────────────────────────────────────────────
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`${c.bg} ${opacityClass} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200 ${interactiveClass}`}
      dir="rtl"
    >
      <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />

      {/* Badge — top-left, away from the right-side accent bar and RTL text start */}
      {badgeLabel && (
        <span
          className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-medium leading-none px-1.5 py-0.5 rounded-full ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      )}

      <div className={`h-full w-full min-w-0 pr-4 pl-2.5 flex flex-col justify-between py-2.5`}>
        <span className={`text-[13px] font-semibold leading-[1.15] truncate ${c.customerText}`}>
          {serviceName}
        </span>
        <span className={`text-[11.5px] font-medium leading-[1.15] truncate ${c.serviceText}`}>
          {customerName}
        </span>
        <div className="min-w-0 flex items-center justify-between gap-2">
          <span
            className={`shrink-0 whitespace-nowrap tabular-nums text-[11px] font-semibold leading-none ${c.metaText}`}
            dir="ltr"
          >
            {startTime} – {endTime}
          </span>
          {serviceProviderName && (
            <span className={`min-w-0 truncate text-[10px] font-normal leading-none opacity-75 ${c.metaText}`}>
              {serviceProviderName.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
