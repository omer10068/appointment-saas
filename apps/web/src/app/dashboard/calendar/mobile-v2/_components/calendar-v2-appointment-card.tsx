'use client';

import { Clock, Pencil } from 'lucide-react';
import { SERVICE_COLORS } from '../_lib/calendar-v2.design';
import type { ServiceColor } from '../_lib/calendar-v2.types';

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

export function CalendarV2AppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceName,
  color,
  serviceProviderName,
  cardSize,
  onEdit,
}: Props) {
  const c = SERVICE_COLORS[color];
  const isCompact = cardSize.height < 56 || cardSize.width < 80;

  if (isCompact) {
    return (
      <div
        className={`${c.bg} rounded-e-xl p-1 w-full h-full relative overflow-hidden transition-all duration-200 hover:shadow-md`}
        dir="rtl"
      >
        <div className={`absolute top-0 bottom-0 right-0 w-1 rounded-full ${c.bar}`} />
        {/* 
        <div className="pr-2 flex h-full items-center justify-between gap-2 border border-violet-700">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`text-[11px] font-medium text-black/90 truncate shrink-0`}>
              {serviceName}
            </span>
            <span className={`text-[12px] font-normal text-black/90 truncate`}>
              {customerName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className={`w-3 h-3 text-black/90 `} />
            <span className={`text-[10px] mt-px leading-none text-black/90 tabular-nums`} dir="ltr">
              {startTime}–{endTime}
            </span>
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              aria-label="עריכה"
            >
              <Pencil className={`w-3 h-3 text-black/90`} />
            </button>
          )}
        </div> */}
        <div className="h-full w-full pr-3 pl-2 flex flex-col justify-between gap-0">
          {/* Top row: Customer name + TODO BUTTON */}
          <div className="flex items-start justify-between gap-0">
            {/* Customer name */}
            <span
              className={`text-[13px] font-semibold text-black/90 truncate leading-3 border border-violet-700`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
            >
              {customerName}
            </span>
            {/* {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              aria-label="עריכה"
            >
              <Pencil className={`w-3 h-3 text-black/90`} />
            </button>
          )} */}
          </div>

          {/* Service name */}
          <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }} className={`text-[10px] font-medium text-black/90 truncate leading-tight `}>
            • {serviceName}
          </span>

          {/* Bottom row: time + provider */}
          {/* <div className="flex items-center justify-between gap-1 border border-violet-800">
          <div className="flex items-center gap-1">
            <Clock className={`w-3 h-3 shrink-0 text-black/90`} />
            <span className={`text-[10px] mt-px leading-none text-black/90 tabular-nums`} dir="ltr">
              {startTime}–{endTime}
            </span>
          </div>
          {serviceProviderName && (
            <span className={`text-[10px] text-black/90 truncate`}>
              {serviceProviderName.split(' ')[0]}
            </span>
          )}
        </div> */}
          {/* Bottom row: time + provider */}

          <div className="flex items-end justify-between gap-1 border border-violet-700">
            <div className="flex items-end gap-1">
              <Clock className={`w-3 h-2.25 shrink-0 text-black/90 `} />
              <span className={`text-[10px] leading-2 text-black/90 tabular-nums`} dir="ltr">
                {startTime} - {endTime}
              </span>
            </div>

            {serviceProviderName && (
              <span className={`text-[10px] leading-2 text-black/90 truncate`}>
                {serviceProviderName.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    // <div
    //   className={`${c.bg} rounded-e-xl h-full w-full relative flex overflow-visible transition-all duration-200 hover:shadow-md`}
    //   dir="rtl"
    // >
    //   <div className={`absolute top-0 bottom-0 right-0 w-1 rounded-full ${c.bar}`} />
    //   <div className="h-full w-full flex pr-3 pl-2 flex-col justify-center">
    //     <div className="w-full flex flex-col justify-around h-full">
    //       {/* Top row: customer name */}
    //       <div className="flex items-start justify-between ">
    //         {/* Customer name */}
    //         <span
    //           className={`text-[13px] font-semibold truncate leading-tight`}
    //           style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    //         >
    //           {customerName}
    //         </span>

    //       </div>

    //       {/* Service name */}

    //       <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    //         className={`text-[10px] font-medium truncate leading-tight`}>
    //        • {serviceName}
    //       </span>

    //       {/* Bottom row: time + provider */}
    //       <div className="flex items-end justify-between gap-1">
    //         <div className="flex gap-0.75">
    //           <Clock className={`w-2.75 h-[13.5px] shrink-0 text-black/90`} />
    //           <span className={`text-[10px] text-black/90 tabular-nums`} dir="ltr">
    //             {startTime} - {endTime}
    //           </span>
    //         </div>

    //         {serviceProviderName && (
    //           <span className={`text-[10px] text-black/90 truncate `}>
    //             {serviceProviderName.split(' ')[0]}
    //           </span>
    //         )}
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div
      className={`${c.bg} rounded-e-xl w-full h-full relative overflow-hidden transition-all duration-200`}
      dir="rtl"
    >
      <div className={`absolute top-0 bottom-0 right-0 w-1 ${c.bar}`} />

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/75 transition-colors z-10"
          aria-label="עריכה"
        >
          <Pencil className={`w-2.5 h-2.5 ${c.editIcon}`} />
        </button>
      )}

      <div className="h-full w-full pr-3.5 pl-2 py-1.5 flex flex-col justify-between">

        {/* שם שירות - ראשי */}
        <span
          className={`text-[13px] font-bold leading-tight truncate ${c.customerText}`}
          style={{ fontFamily: "'Rubik', 'Assistant', 'Noto Sans Hebrew', system-ui, sans-serif" }}
        >
          {serviceName}
        </span>

        {/* שם לקוח - משני */}
        <span
          className={`text-[11px] font-medium leading-tight truncate ${c.serviceText}`}
          style={{ fontFamily: "'Rubik', 'Assistant', 'Noto Sans Hebrew', system-ui, sans-serif" }}
        >
          {customerName}
        </span>

        {/* שעה + מטפל */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <Clock className={`w-2.5 h-2.5 shrink-0 ${c.metaText}`} />
            <span className={`text-[10px] tabular-nums leading-none ${c.metaText}`} dir="ltr">
              {startTime} – {endTime}
            </span>
          </div>
          {serviceProviderName && (
            <span className={`text-[10px] leading-none truncate ${c.metaText}`}>
              {serviceProviderName.split(' ')[0]}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
