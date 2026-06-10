'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DashboardAppointmentDto } from '@appointment/contracts';
import { fetchDashboardAppointments } from '../../../../../lib/api';
import { formatShortDate } from '../_lib/calendar.utils';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_BADGE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED:             { bg: 'bg-accent',     text: 'text-accent-foreground', dot: 'bg-primary' },
  CONFIRMED:             { bg: 'bg-accent',     text: 'text-accent-foreground', dot: 'bg-primary' },
  COMPLETED:             { bg: 'bg-emerald-50', text: 'text-emerald-700',       dot: 'bg-emerald-500' },
  CANCELLED_BY_CUSTOMER: { bg: 'bg-muted',      text: 'text-muted-foreground',  dot: 'bg-muted-foreground/60' },
  CANCELLED_BY_BUSINESS: { bg: 'bg-muted',      text: 'text-muted-foreground',  dot: 'bg-muted-foreground/60' },
  NO_SHOW:               { bg: 'bg-amber-50',   text: 'text-amber-700',         dot: 'bg-amber-500' },
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:             'מתוכנן',
  CONFIRMED:             'מאושר',
  COMPLETED:             'הושלם',
  CANCELLED_BY_CUSTOMER: 'בוטל ע"י לקוח',
  CANCELLED_BY_BUSINESS: 'בוטל ע"י עסק',
  NO_SHOW:               'לא הגיע',
};

const FALLBACK_STYLE = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' };

const DISPLAY_LIMIT = 10;
const LOOKBACK_MONTHS = 18;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  businessId: string | null;
  businessCustomerId: string;
  getToken: () => Promise<string | null>;
  timezone: string;
  onCountReady?: (count: number) => void;
}

export function CustomerAppointmentHistory({
  businessId,
  businessCustomerId,
  getToken,
  timezone,
  onCountReady,
}: Props) {
  const onCountReadyRef = useRef(onCountReady);
  onCountReadyRef.current = onCountReady;
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
          const sliced = [...data].reverse().slice(0, DISPLAY_LIMIT);
          setItems(sliced);
          onCountReadyRef.current?.(sliced.length);
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

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2">
        <p className="text-sm text-muted-foreground">שגיאה בטעינה</p>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="text-sm font-medium text-primary"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-1 text-sm text-muted-foreground">אין היסטוריית תורים</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((apt) => {
        const start = new Date(apt.startsAt);
        const style = STATUS_BADGE_STYLE[apt.status] ?? FALLBACK_STYLE;
        const label = STATUS_LABEL[apt.status] ?? apt.status;
        return (
          <li
            key={apt.id}
            className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{apt.serviceName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {formatShortDate(start, timezone)}
              </p>
            </div>
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}
            >
              <span className={`size-1.5 rounded-full ${style.dot}`} />
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
