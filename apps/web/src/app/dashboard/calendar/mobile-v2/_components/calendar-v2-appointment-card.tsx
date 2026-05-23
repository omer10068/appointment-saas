'use client';

import { Pencil } from 'lucide-react';
import type { Appointment } from '../_lib/calendar-v2.types';
import { SERVICE_COLORS, STATUS_STYLES } from '../_lib/calendar-v2.design';
import { formatTime } from '../_lib/calendar-v2.utils';

interface Props {
  appointment: Appointment;
  onEdit?: (id: string) => void;
}

export function CalendarV2AppointmentCard({ appointment, onEdit }: Props) {
  const { customer, service, provider, startTime, endTime, status } = appointment;
  const c = SERVICE_COLORS[service.color];
  const s = STATUS_STYLES[status];

  const isScheduled = status === 'scheduled';

  return (
    <div
      className={[
        'relative rounded-2xl border px-4 py-3 mb-3',
        'min-h-[80px] flex flex-col justify-between',
        c.bg,
        c.border,
        s.cardOpacity,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Status badge — non-scheduled only */}
      {s.label && (
        <span
          className={[
            'absolute top-3 left-3',
            'text-xs font-medium px-2 py-0.5 rounded-full',
            s.badgeBg,
            s.badgeText,
          ].join(' ')}
        >
          {s.label}
        </span>
      )}

      {/* Edit button — scheduled only, subtle */}
      {isScheduled && onEdit && (
        <button
          onClick={() => onEdit(appointment.id)}
          aria-label="עריכת פגישה"
          className={[
            'absolute top-2.5 left-3 p-1.5 rounded-lg',
            'opacity-25 hover:opacity-55 active:opacity-70 transition-opacity',
            c.editIcon,
          ].join(' ')}
        >
          <Pencil size={13} />
        </button>
      )}

      {/* Customer + service */}
      <div className="flex flex-col gap-0.5">
        <span
          className={[
            'text-base font-semibold leading-snug',
            c.customerText,
            s.nameDecoration,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {customer.name}
        </span>
        <span className={['text-sm leading-snug', c.serviceText].join(' ')}>
          {service.name}
        </span>
      </div>

      {/* Time + provider */}
      <div className={['flex items-center gap-1.5 text-xs mt-2', c.metaText].join(' ')}>
        <span className="tabular-nums">
          {formatTime(startTime)}–{formatTime(endTime)}
        </span>
        <span className="opacity-40">·</span>
        <span>{provider.name}</span>
      </div>
    </div>
  );
}
