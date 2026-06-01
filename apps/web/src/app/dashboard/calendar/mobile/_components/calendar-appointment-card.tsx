'use client';

import { SERVICE_COLORS } from '../_lib/calendar.design';
import type { ServiceColor } from '../_lib/calendar.types';

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
  serviceProviderName?: string;
  note?: string;
  cardSize: CardSize;
  onEdit?: () => void;
}

export function CalendarAppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceName,
  color,
  serviceProviderName,
  cardSize,
}: Props) {
  const c = SERVICE_COLORS[color];
  const isCompact = cardSize.height > 34 && cardSize.height < 56;
  const isTiny = cardSize.height <= 34;
  const isExtraTiny = cardSize.height <= 27;

  if (isTiny || isExtraTiny) {
    return (
      <div
        className={`${c.bg} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />

        <div className={`h-full w-full min-w-0 pr-4 pl-3 flex flex-col justify-between py-0.75`}>
          <div className={`h-full w-full flex flex-row ${isExtraTiny ? 'items-center' : 'items-end'} justify-between`}>
            <div className={`h-full flex flex-col justify-center items-start`}>
              <span
                className={`text-[${isExtraTiny ? '10px' : '11px'}] align-middle font-semibold ${c.customerText}`}
              >
                {serviceName}
              </span>

              {!isExtraTiny &&
                <span
                  className={`text-[10.5px] font-medium leading-[1.15] truncate ${c.serviceText}`}
                >
                  {customerName}
                </span>}
            </div>

            <span
              className={`shrink-0 whitespace-nowrap tabular-nums text-[10px] font-semibold leading-none ${c.metaText}`}
              dir="ltr"
            >
              {startTime} – {endTime}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${c.bg} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200`}
      dir="rtl"
    >
      <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />

      <div className={`h-full w-full min-w-0 pr-4 pl-2.5 flex flex-col justify-between ${isCompact ? `py-1` : `py-2.5`}`}>
        <span
          className={`${isCompact ? `text-[12px]` : `text-[13px]`} font-semibold leading-[1.15] truncate ${c.customerText} `}
        >
          {serviceName}
        </span>

        <span
          className={`${isCompact ? `text-[11px]` : `text-[11.5px]`} font-medium leading-[1.15] truncate ${c.serviceText}`}
        >
          {customerName}
        </span>

        <div className="min-w-0 flex items-center justify-between gap-2">
          <span
            className={`shrink-0 whitespace-nowrap tabular-nums text-[${isCompact ? `10px` : `11px`}] font-semibold leading-none ${c.metaText}`}
            dir="ltr"
          >
            {startTime} – {endTime}
          </span>

          {serviceProviderName && (
            <span
              className={`min-w-0 truncate text-[10px] font-normal leading-none opacity-75 ${c.metaText}`}
            >
              {serviceProviderName.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
