import { Star, MessageSquare, Check, Pencil } from 'lucide-react';

interface Props {
  customerName: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  note?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  onEdit?: () => void;
}

export function CalendarV2AppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceName,
  note,
  status,
  onEdit,
}: Props) {
  return (
    <div
      className={[
        'h-full min-h-[72px] bg-[#fdf2f4] rounded-[6px]  overflow-hidden flex opacity-85',
        status === 'cancelled' ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Accent strip — first flex child = right side in RTL */}
      <div className="w-[4px] bg-[#e88a98] shrink-0" />

      {/* Content area */}
      <div className="flex-1 p-2 pr-2.5 min-w-0 flex flex-col justify-between">
        {/* Top row: customer name + icon cluster */}
        <div className="flex items-start justify-between gap-1">
          <span className="text-[13px] font-medium text-[#2d2a33] leading-tight truncate">
            {customerName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 text-[#e0a526] fill-[#e0a526]" />
            <MessageSquare className="w-3.5 h-3.5 text-[#8e8a96]" />
            <div className="w-4 h-4 rounded-full bg-[#5bb5cf] flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="עריכת פגישה"
                className="opacity-30 hover:opacity-60 active:opacity-80 transition-opacity"
              >
                <Pencil className="w-3.5 h-3.5 text-[#8e8a96]" />
              </button>
            )}
          </div>
        </div>

        {/* Time range */}
        <div className="text-[11px] text-[#8e8a96] mt-0.5 tabular-nums">
          {startTime}–{endTime}
        </div>

        {/* Service name */}
        <div className="text-[12px] text-[#5c5768] mt-0.5 truncate">
          {serviceName}
        </div>

        {/* Optional note */}
        {note && (
          <div className="text-[11px] text-[#e07a4f] mt-1 leading-tight line-clamp-2">
            הערה: {note}
          </div>
        )}
      </div>
    </div>
  );
}