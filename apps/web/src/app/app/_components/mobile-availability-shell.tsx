'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AlertTriangle, Clock } from 'lucide-react';
import type {
  DashboardWorkingHourDto,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import {
  ApiError,
  fetchBusinessWorkingHours,
  previewBusinessWorkingHoursUpdate,
  updateBusinessWorkingHours,
  type BusinessHoursUpdatePreview,
} from '@/lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { MobileToast } from './mobile-toast';
import { useMobileToast } from '../_lib/useMobileToast';
import { HEBREW_DAY_ABBR } from '../_lib/calendar.utils';
import { MobilePageHeader } from './mobile-page-header';

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

const REASON_LABEL: Record<'CLOSED' | 'CLAMPED', string> = {
  CLOSED: 'ייסגר',
  CLAMPED: 'יצומצם',
};

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
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">פתיחה</span>
            <span className="text-xs text-muted-foreground">סגירה</span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="time"
              value={row.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              disabled={!canMutate}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <span className="shrink-0 text-sm text-muted-foreground">—</span>
            <input
              type="time"
              value={row.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              disabled={!canMutate}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

interface ConfirmDialogProps {
  preview: BusinessHoursUpdatePreview;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ preview, saving, onConfirm, onCancel }: ConfirmDialogProps) {
  const { affectedProviders, futureAppointmentsOutsideNewHoursCount } = preview;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="text-base font-bold text-foreground">שמירת שינויים בשעות הפעילות</h2>

        {affectedProviders.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              שינויים אלה ישפיעו על שעות הפעילות של נותני השירות הבאים:
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {affectedProviders.map((sp) => (
                <div key={sp.id}>
                  <p className="text-sm font-semibold text-foreground">{sp.displayName}</p>
                  <ul className="mt-1 space-y-0.5">
                    {sp.changes.map((c) => {
                      const dayName = HEBREW_DAY_ABBR[c.dayOfWeek] ?? String(c.dayOfWeek);
                      const beforeStr = c.before.isClosed
                        ? 'סגור'
                        : `${c.before.startTime}–${c.before.endTime}`;
                      const afterStr = c.after.isClosed
                        ? 'סגור'
                        : `${c.after.startTime}–${c.after.endTime}`;
                      return (
                        <li key={c.dayOfWeek} className="text-xs text-muted-foreground">
                          {dayName}: {beforeStr} ← {afterStr}{' '}
                          <span className="font-medium text-foreground">
                            ({REASON_LABEL[c.reason]})
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {futureAppointmentsOutsideNewHoursCount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-snug">
              {futureAppointmentsOutsideNewHoursCount === 1
                ? 'תור עתידי אחד יהיה מחוץ לשעות הפעילות החדשות.'
                : `${futureAppointmentsOutsideNewHoursCount} תורים עתידיים יהיו מחוץ לשעות הפעילות החדשות.`}{' '}
              התורים לא יבוטלו, יועברו או ישונו — הם ישארו כפי שהם.
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground transition active:opacity-70 disabled:opacity-40"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:opacity-80 disabled:opacity-40"
          >
            {saving ? 'שומר...' : 'שמירה'}
          </button>
        </div>
      </div>
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
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness, currentBusinessId: businessId } =
    useBusiness();

  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const { message: toastMessage, showToast } = useMobileToast();

  const [hours, setHours]             = useState<HourRow[]>(defaultHours());
  const [isDirty, setIsDirty]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [previewing, setPreviewing]   = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [retryKey, setRetryKey]       = useState(0);
  const [pendingPreview, setPendingPreview] = useState<BusinessHoursUpdatePreview | null>(null);

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

  function buildPayload(): UpdateWorkingHoursPayload {
    return {
      hours: hours.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isClosed: r.isClosed,
        startTime: r.isClosed ? null : r.startTime,
        endTime: r.isClosed ? null : r.endTime,
      })),
    };
  }

  async function handleSave() {
    if (!businessId) return;
    const payload = buildPayload();

    // Step 1: fetch preview
    setPreviewing(true);
    let preview: BusinessHoursUpdatePreview;
    try {
      preview = await previewBusinessWorkingHoursUpdate(
        businessId,
        payload,
        () => getTokenRef.current(),
      );
    } catch {
      showToast('שגיאה בבדיקת ההשפעות — נסה שוב', 5000);
      setPreviewing(false);
      return;
    } finally {
      setPreviewing(false);
    }

    // Step 2: if nothing is affected, save immediately without confirmation
    if (
      preview.affectedProviders.length === 0 &&
      preview.futureAppointmentsOutsideNewHoursCount === 0
    ) {
      await applyUpdate(payload);
      return;
    }

    // Step 3: show confirmation dialog
    setPendingPreview(preview);
  }

  async function applyUpdate(payload: UpdateWorkingHoursPayload) {
    if (!businessId) return;
    setSaving(true);
    try {
      const updated = await updateBusinessWorkingHours(
        businessId,
        payload,
        () => getTokenRef.current(),
      );
      setHours(mergeHours(updated));
      setIsDirty(false);
      setPendingPreview(null);
      showToast('שעות העבודה נשמרו בהצלחה');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? 'שגיאה בשמירת שעות העסק'
          : 'שגיאה בשמירת שעות העסק';
      showToast(msg, 5000);
    } finally {
      setSaving(false);
    }
  }

  const businessName = currentBusiness?.business.name ?? '';

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <MobilePageHeader
        title="שעות פעילות"
        icon={Clock}
        subtitle={businessName}
        backHref="/app/settings"
      />

      {/* ── Section title ────────────────────────────────────────────────── */}
      {!loading && !loadError && currentBusiness && (
        <div className="flex-none px-5 pb-2 pt-4">
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

      {/* ── Save button ──────────────────────────────────────────────────── */}
      {canMutate && !loading && !loadError && currentBusiness && (
        <div className="flex-none px-5 pb-24 pt-3">
          <button
            onClick={() => void handleSave()}
            disabled={saving || previewing || !isDirty}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:opacity-80 disabled:opacity-40"
          >
            {previewing ? 'בודק השפעות...' : saving ? 'שומר...' : 'שמירת שעות'}
          </button>
        </div>
      )}

      <MobileToast message={toastMessage} />
      <CalendarBottomNav activeKey="settings" />

      {/* ── Confirmation dialog (portal-free overlay) ─────────────────────── */}
      {pendingPreview && (
        <ConfirmDialog
          preview={pendingPreview}
          saving={saving}
          onConfirm={() => void applyUpdate(buildPayload())}
          onCancel={() => setPendingPreview(null)}
        />
      )}
    </MobilePhoneFrame>
  );
}
