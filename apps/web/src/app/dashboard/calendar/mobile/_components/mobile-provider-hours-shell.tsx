'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import type {
  DashboardServiceProviderDto,
  DashboardWorkingHourDto,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import {
  ApiError,
  fetchDashboardServiceProviders,
  fetchServiceProviderWorkingHours,
  updateServiceProviderWorkingHours,
} from '../../../../../lib/api';
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

// ─── Toggle ───────────────────────────────────────────────────────────────────

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
      {/* Absolute left/right avoids RTL translate issues in Tailwind v4. */}
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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProvidersSkeleton() {
  return (
    <div className="space-y-3 pt-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function HoursSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Provider hours sheet ─────────────────────────────────────────────────────

interface ProviderHoursSheetProps {
  open: boolean;
  provider: DashboardServiceProviderDto | null;
  businessId: string | null;
  canMutate: boolean;
  getToken: () => Promise<string | null>;
  showToast: (msg: string, duration?: number) => void;
  onClosed: () => void;
}

function ProviderHoursSheet({
  open,
  provider,
  businessId,
  canMutate,
  getToken,
  showToast,
  onClosed,
}: ProviderHoursSheetProps) {
  const [visible, setVisible]     = useState(false);
  const isClosingRef              = useRef(false);
  const getTokenRef               = useRef(getToken);
  getTokenRef.current             = getToken;

  const [hours, setHours]         = useState<HourRow[]>(defaultHours());
  const [isDirty, setIsDirty]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  // Open animation
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Fetch hours when the sheet opens or the provider/retryKey changes
  const providerId = provider?.id ?? null;
  useEffect(() => {
    if (!open || !businessId || !providerId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setIsDirty(false);
    fetchServiceProviderWorkingHours(businessId, providerId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) {
          setHours(mergeHours(data));
          setIsDirty(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('שגיאה בטעינת שעות הצוות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, businessId, providerId, retryKey]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  function updateDay(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setIsDirty(true);
  }

  async function handleSave() {
    if (!businessId || !provider) return;
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
      const updated = await updateServiceProviderWorkingHours(
        businessId,
        provider.id,
        payload,
        () => getTokenRef.current(),
      );
      setHours(mergeHours(updated));
      setIsDirty(false);
      showToast('שעות הצוות נשמרו בהצלחה');
    } catch (err) {
      const isConflict =
        err instanceof ApiError && (err.status === 409 || err.status === 400);
      showToast(
        isConflict
          ? 'לא ניתן לשמור — קיימים תורים מתוכננים בשעות שנסגרו'
          : 'שגיאה בשמירת שעות הצוות, נסה שוב',
        5000,
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open && !visible) return null;

  const showFooter = canMutate && !loading && !loadError;

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={saving ? undefined : triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0 flex flex-col',
          'max-h-[90%]',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + header */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">
                {provider?.displayName}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {canMutate ? 'עריכת שעות עבודה' : 'שעות עבודה'}
              </p>
            </div>
            <button
              onClick={saving ? undefined : triggerClose}
              aria-label="סגור"
              disabled={saving}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 disabled:opacity-40"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={['flex-1 overflow-y-auto px-5', showFooter ? 'pb-2' : 'pb-8'].join(' ')}>
          {loading ? (
            <HoursSkeleton />
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="text-sm font-medium text-primary"
              >
                נסה שוב
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card/50 px-4 py-1">
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

        {/* Footer — save button, OWNER/MANAGER only */}
        {showFooter && (
          <div className="shrink-0 border-t border-border bg-card px-5 pb-8 pt-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:opacity-80 disabled:opacity-40"
            >
              {saving ? 'שומר...' : 'שמירת שעות'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: DashboardServiceProviderDto;
  onClick: () => void;
}

function ProviderCard({ provider, onClick }: ProviderCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-right shadow-sm shadow-foreground/5 transition active:scale-[0.99]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
        {provider.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {provider.displayName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">שעות עבודה אישיות</p>
      </div>
      {/* Physical left in RTL = "open" chevron */}
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileProviderHoursShell() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness, currentBusinessId: businessId } = useDashboardBusiness();

  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const { message: toastMessage, showToast } = useMobileToast();

  const [providers, setProviders] = useState<DashboardServiceProviderDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  const [selectedProvider, setSelectedProvider] =
    useState<DashboardServiceProviderDto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setProviders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchDashboardServiceProviders(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setProviders(data.filter((p) => p.isActive));
      })
      .catch(() => {
        if (!cancelled) setLoadError('שגיאה בטעינת רשימת הצוות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [businessId, retryKey]);

  const businessName = currentBusiness?.business.name ?? '';

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none px-5 pb-3 pt-9">
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push('/home')}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-opacity active:opacity-60"
              aria-label="חזרה לדף הבית"
            >
              <ChevronRight className="size-4" />
              <span>חזרה</span>
            </button>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              שעות צוות
            </h1>
            {businessName && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {businessName}
              </p>
            )}
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Users className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          הגדרת שעות עבודה אישיות לכל נותן שירות, בנוסף לשעות הכלליות של העסק.
        </p>
      </header>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {loading ? (
          <ProvidersSkeleton />
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
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              אין נותני שירות פעילים
            </p>
            <p className="max-w-[200px] text-center text-xs text-muted-foreground">
              הוסף נותני שירות בלשונית הצוות כדי להגדיר שעות עבודה אישיות
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onClick={() => {
                  setSelectedProvider(provider);
                  setSheetOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ProviderHoursSheet
        open={sheetOpen}
        provider={selectedProvider}
        businessId={businessId ?? null}
        canMutate={canMutate}
        getToken={() => getTokenRef.current()}
        showToast={showToast}
        onClosed={() => setSheetOpen(false)}
      />

      <MobileToast message={toastMessage} />
      {/* Settings page — no main-nav tab is active */}
      <CalendarBottomNav activeKey="provider-hours" />
    </MobilePhoneFrame>
  );
}
