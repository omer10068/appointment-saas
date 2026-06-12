'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChevronRight, Clock } from 'lucide-react';
import type {
  DashboardWorkingHourDto,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import {
  ApiError,
  fetchBusinessWorkingHours,
  updateBusinessWorkingHours,
} from '@/lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { MobileToast } from './mobile-toast';
import { useMobileToast } from '../_lib/useMobileToast';
import { HEBREW_DAY_ABBR } from '../_lib/calendar.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourRow {
  dayOfWeek: number;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultHours(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isClosed: i === 5 || i === 6,
    startTime: '09:00',
    endTime: '17:00',
  }));
}

function mergeHours(loaded: DashboardWorkingHourDto[]): HourRow[] {
  const base = defaultHours();
  const map = new Map(loaded.map((h) => [h.dayOfWeek, h]));
  return base.map((d) => {
    const l = map.get(d.dayOfWeek);
    if (!l) return d;
    return {
      dayOfWeek: l.dayOfWeek,
      isClosed: l.isClosed,
      startTime: l.startTime ?? '09:00',
      endTime: l.endTime ?? '17:00',
    };
  });
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function DayToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'cursor-default opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Absolute left/right avoids RTL transform issues in Tailwind v4. */}
      <span
        className={[
          'pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
          checked ? 'right-1' : 'left-1',
        ].join(' ')}
      />
    </button>
  );
}

// ─── Day row ──────────────────────────────────────────────────────────────────

interface DayRowProps {
  row: HourRow;
  onChange: (patch: Partial<HourRow>) => void;
  canMutate: boolean;
}

function DayRow({ row, onChange, canMutate }: DayRowProps) {
  const dayName = HEBREW_DAY_ABBR[row.dayOfWeek] ?? String(row.dayOfWeek);
  const isOpen = !row.isClosed;

  return (
    <div className="space-y-2.5 border-b border-border py-3.5 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{dayName}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {isOpen ? 'פתוח' : 'סגור'}
          </span>
          <DayToggle
            checked={isOpen}
            onChange={() => onChange({ isClosed: !row.isClosed })}
            disabled={!canMutate}
          />
        </div>
      </div>

      {isOpen && (
        <div className="flex items-end gap-2.5 pt-1">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">פתיחה</span>
            <input
              type="time"
              value={row.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              disabled={!canMutate}
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          </div>
          <span className="pb-2.5 text-sm text-muted-foreground">—</span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">סגירה</span>
            <input
              type="time"
              value={row.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              disabled={!canMutate}
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileBusinessHoursShell() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness, currentBusinessId: businessId } =
    useBusiness();

  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const { message: toastMessage, showToast } = useMobileToast();

  const [hours, setHours]       = useState<HourRow[]>(defaultHours());
  const [isDirty, setIsDirty]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!businessId) {
      setHours(defaultHours());
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchBusinessWorkingHours(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) { setHours(mergeHours(data)); setIsDirty(false); }
      })
      .catch(() => {
        if (!cancelled) setLoadError('שגיאה בטעינת שעות העסק');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId, retryKey]);

  function updateDay(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setIsDirty(true);
  }

  async function handleSave() {
    if (!businessId) return;
    setSaving(true);

    const payload: UpdateWorkingHoursPayload = {
      hours: hours.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isClosed: r.isClosed,
        startTime: r.isClosed ? null : r.startTime,
        endTime: r.isClosed ? null : r.endTime,
      })),
    };

    try {
      const updated = await updateBusinessWorkingHours(
        businessId,
        payload,
        () => getTokenRef.current(),
      );
      setHours(mergeHours(updated));
      setIsDirty(false);
      showToast('שעות העבודה נשמרו בהצלחה');
    } catch (err) {
      const isConflict =
        err instanceof ApiError && (err.status === 409 || err.status === 400);
      showToast(
        isConflict
          ? 'לא ניתן לשמור — קיימים תורים מתוכננים בשעות שנסגרו'
          : 'שגיאה בשמירת שעות העסק',
        5000,
      );
    } finally {
      setSaving(false);
    }
  }

  const businessName = currentBusiness?.business.name ?? '';

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none px-5 pt-9 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push('/app/settings')}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-opacity active:opacity-60"
              aria-label="חזרה"
            >
              <ChevronRight className="size-4" />
              <span>חזרה</span>
            </button>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              שעות פעילות
            </h1>
            {businessName && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {businessName}
              </p>
            )}
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Clock className="size-5" />
          </div>
        </div>
      </header>

      {/* ── Section title — flex-none, does not scroll ───────────────────── */}
      {!loading && !loadError && currentBusiness && (
        <div className="flex-none px-5 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            שעות פתיחה שבועיות
          </p>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="text-sm font-medium text-primary"
            >
              נסה שוב
            </button>
          </div>
        ) : !currentBusiness ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">לא נבחר עסק</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card px-4 py-1 shadow-sm shadow-foreground/5">
              {hours.map((row) => (
                <DayRow
                  key={row.dayOfWeek}
                  row={row}
                  onChange={(patch) => updateDay(row.dayOfWeek, patch)}
                  canMutate={canMutate}
                />
              ))}
            </div>

            {!canMutate && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                צפייה בלבד — אין הרשאה לעריכה
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Save button — outside scroll, sits above bottom nav ──────────── */}
      {canMutate && !loading && !loadError && currentBusiness && (
        <div className="flex-none px-5 pb-24 pt-3">
          <button
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:opacity-80 disabled:opacity-40"
          >
            {saving ? 'שומר...' : 'שמירת שעות'}
          </button>
        </div>
      )}

      <MobileToast message={toastMessage} />
      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
