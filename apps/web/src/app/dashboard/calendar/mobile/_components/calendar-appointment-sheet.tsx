'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDashboardI18n } from '../../../_i18n/useDashboardI18n';
import { SERVICE_COLORS } from '../_lib/calendar.design';
import { formatTime } from '../_lib/calendar.utils';
import type { Appointment, AppointmentStatus } from '../_lib/calendar.types';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled:           'bg-blue-50 text-blue-700',
  confirmed:           'bg-indigo-50 text-indigo-700',
  completed:           'bg-green-50 text-green-700',
  cancelled_by_customer: 'bg-gray-100 text-gray-500',
  cancelled_by_business: 'bg-gray-100 text-gray-500',
  no_show:             'bg-orange-50 text-orange-700',
};

interface Props {
  appointment: Appointment | null;
  timezone: string;
  onClose: () => void;
}

export function CalendarAppointmentSheet({ appointment, timezone, onClose }: Props) {
  const dict = useDashboardI18n();
  const tList = dict.appointmentsList;

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled:             tList.statusScheduled,
    confirmed:             tList.statusConfirmed,
    completed:             tList.statusCompleted,
    cancelled_by_customer: tList.statusCancelledByCustomer,
    cancelled_by_business: tList.statusCancelledByBusiness,
    no_show:               tList.statusNoShow,
  };

  // Animate open: mount first, then transition on the next paint
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!appointment) { setVisible(false); return; }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [appointment]);

  if (!appointment) return null;

  const c = SERVICE_COLORS[appointment.service.color];

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header strip — service color accent */}
        <div className={`${c.bg} mx-4 mt-2 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-[15px] font-semibold leading-tight truncate ${c.customerText}`}>
              {appointment.service.name}
            </span>
            <span className={`text-[13px] font-normal leading-tight truncate ${c.serviceText}`}>
              {appointment.customer.name}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="mr-3 p-1.5 rounded-full text-gray-400 hover:bg-black/5 active:bg-black/10 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-4 pb-8 flex flex-col gap-4">
          <DetailRow label="שעה">
            <span className="tabular-nums" dir="ltr">
              {formatTime(appointment.startTime, timezone)} – {formatTime(appointment.endTime, timezone)}
            </span>
          </DetailRow>

          <DetailRow label="נותן שירות">
            {appointment.provider.name}
          </DetailRow>

          <DetailRow label="סטטוס">
            <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[appointment.status]}`}>
              {STATUS_LABELS[appointment.status]}
            </span>
          </DetailRow>

          {appointment.notes && (
            <DetailRow label="הערות">
              <span className="text-gray-600 dark:text-gray-300 leading-snug whitespace-pre-wrap">
                {appointment.notes}
              </span>
            </DetailRow>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className="text-[14px] text-gray-800 dark:text-gray-200 text-right min-w-0">{children}</span>
    </div>
  );
}
