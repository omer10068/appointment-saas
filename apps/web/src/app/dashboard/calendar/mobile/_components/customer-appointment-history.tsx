'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DashboardAppointmentDto } from '@appointment/contracts';
import { fetchDashboardAppointments } from '../../../../../lib/api';
import { formatDate, formatTime } from '../_lib/calendar.utils';

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:             'bg-blue-50 text-blue-700',
  CONFIRMED:             'bg-indigo-50 text-indigo-700',
  COMPLETED:             'bg-green-50 text-green-700',
  CANCELLED_BY_CUSTOMER: 'bg-gray-100 text-gray-500',
  CANCELLED_BY_BUSINESS: 'bg-gray-100 text-gray-500',
  NO_SHOW:               'bg-orange-50 text-orange-700',
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:             'מתוכנן',
  CONFIRMED:             'מאושר',
  COMPLETED:             'הסתיים',
  CANCELLED_BY_CUSTOMER: 'בוטל ע"י לקוח',
  CANCELLED_BY_BUSINESS: 'בוטל ע"י עסק',
  NO_SHOW:               'לא הגיע',
};

const DISPLAY_LIMIT = 10;
// Lookback window: 18 months of history
const LOOKBACK_MONTHS = 18;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  businessId: string | null;
  businessCustomerId: string;
  getToken: () => Promise<string | null>;
  timezone: string;
}

export function CustomerAppointmentHistory({
  businessId,
  businessCustomerId,
  getToken,
  timezone,
}: Props) {
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [items, setItems]       = useState<DashboardAppointmentDto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - LOOKBACK_MONTHS);

    fetchDashboardAppointments(businessId, () => getTokenRef.current(), {
      businessCustomerId,
      from: from.toISOString(),
      to: to.toISOString(),
    })
      .then((data) => {
        if (!cancelled) {
          // Backend sorts ASC; reverse for newest-first display
          setItems([...data].reverse().slice(0, DISPLAY_LIMIT));
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, businessCustomerId, retryKey]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        תורים קודמים
      </span>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={18} className="animate-spin text-gray-300 dark:text-gray-600" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-1.5 py-2">
          <p className="text-[12px] text-gray-400 dark:text-gray-500">שגיאה בטעינה</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-[12px] font-medium text-blue-600 dark:text-blue-400"
          >
            נסה שוב
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-gray-400 dark:text-gray-500 py-1">
          אין תורים קודמים ללקוח הזה
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((apt) => {
            const start = new Date(apt.startsAt);
            const badge = STATUS_BADGE[apt.status] ?? 'bg-gray-100 text-gray-500';
            const label = STATUS_LABEL[apt.status] ?? apt.status;
            return (
              <div
                key={apt.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-tight truncate">
                    {apt.serviceName}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge}`}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {formatDate(start, timezone)} · {formatTime(start, timezone)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {apt.serviceProviderName}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
