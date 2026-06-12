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

const BADGE_LABEL: Partial<Record<AppointmentStatus, string>> = {
  completed:             'הושלם',
  no_show:               'לא הגיע',
  cancelled_by_customer: 'בוטל',
  cancelled_by_business: 'בוטל',
};

const BADGE_CLASS: Partial<Record<AppointmentStatus, string>> = {
  completed:             'bg-black/10 text-black/55',
  no_show:               'bg-black/20 text-black/65',
  cancelled_by_customer: 'bg-black/10 text-black/50',
  cancelled_by_business: 'bg-black/10 text-black/50',
};

const TERMINAL_OPACITY: Partial<Record<AppointmentStatus, string>> = {
  completed:             'opacity-75',
  no_show:               'opacity-70',
  cancelled_by_customer: 'opacity-55',
  cancelled_by_business: 'opacity-55',
};

// ─── Shared class fragments ───────────────────────────────────────────────────

const CARD_BASE = 'rounded-l-xl rounded-r-sm w-full h-full relative overflow-hidden shadow-sm shadow-black/[0.07] ring-1 ring-inset ring-black/[0.07] transition-all duration-150';
const CARD_INTERACTIVE = 'cursor-pointer active:scale-[0.98] active:brightness-95';

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
  const isCompact   = cardSize.height > 34 && cardSize.height < 56;
  const isTiny      = cardSize.height <= 34;
  const isExtraTiny = cardSize.height <= 27;

  const badgeLabel   = BADGE_LABEL[status];
  const badgeClass   = BADGE_CLASS[status] ?? '';
  const opacityClass = TERMINAL_OPACITY[status] ?? '';
  const isCancelled  = status === 'cancelled_by_customer' || status === 'cancelled_by_business';
  const strikeClass  = isCancelled ? 'line-through decoration-current/40' : '';
  const interactive  = onClick ? CARD_INTERACTIVE : '';

  // ── Extra-tiny / Tiny (≤ 34 px) ──────────────────────────────────────────
  if (isTiny || isExtraTiny) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`${c.bg} ${opacityClass} ${CARD_BASE} ${interactive}`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1.5 ${c.bar}`} />
        <div className="h-full w-full min-w-0 pr-3.5 pl-2.5 flex flex-col justify-center gap-0.5 py-0.5">
          <span className={`text-[12px] font-bold leading-tight truncate text-foreground ${strikeClass}`}>
            {serviceName}
          </span>
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className={`min-w-0 truncate text-[10.5px] font-medium leading-none text-foreground/70 ${strikeClass}`}>
              {customerName}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap tabular-nums text-[9.5px] font-bold leading-none text-foreground/75`}
              dir="ltr"
            >
              {startTime} - {endTime}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Compact (34 < height < 56 px) ────────────────────────────────────────
  if (isCompact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`${c.bg} ${opacityClass} ${CARD_BASE} ${interactive}`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1.5 ${c.bar}`} />
        <div className="h-full w-full min-w-0 pr-3.5 pl-2.5 flex flex-col justify-center gap-0.5 py-1">
          <span className={`text-[12px] font-bold leading-tight truncate text-foreground ${strikeClass}`}>
            {serviceName}
          </span>
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className={`min-w-0 truncate text-[10.5px] font-medium leading-none text-foreground/70 ${strikeClass}`}>
              {customerName}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap tabular-nums text-[9.5px] font-bold leading-none text-foreground/75`}
              dir="ltr"
            >
              {startTime} - {endTime}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Regular (≥ 56 px) ────────────────────────────────────────────────────
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`${c.bg} ${opacityClass} ${CARD_BASE} ${interactive}`}
      dir="rtl"
    >
      <div className={`absolute top-0 bottom-0 right-0 w-1.5 ${c.bar}`} />

      {badgeLabel && (
        <span
          className={`absolute top-1.5 left-2 z-10 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded-full ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      )}

      <div className="h-full w-full min-w-0 pr-4.5 pl-2.5 flex flex-col justify-between py-2">
        <span className={`text-[13px] font-bold leading-tight truncate text-foreground ${strikeClass}`}>
          {serviceName}
        </span>
        <span className={`text-[11px] font-medium leading-tight truncate text-foreground/70 ${strikeClass}`}>
          {customerName}
        </span>
        <div className="min-w-0 flex items-center justify-between gap-2">
          <span
            className="shrink-0 whitespace-nowrap tabular-nums text-[10.5px] font-bold leading-none text-foreground/75"
            dir="ltr"
          >
            {startTime} - {endTime}
          </span>
          {serviceProviderName && (
            <span className="min-w-0 truncate text-[10px] font-normal leading-none text-foreground/40">
              {serviceProviderName.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
