'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, Users, X } from 'lucide-react';
import type {
  DashboardServiceProviderDto,
  DashboardWorkingHourDto,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import {
  ApiError,
  fetchBusinessWorkingHours,
  fetchServiceProviderWorkingHours,
  updateServiceProviderWorkingHours,
} from '@/lib/api';
import { useAppServiceProviders } from '../_hooks/useAppServiceProviders';
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

interface BizHourRow {
  dayOfWeek: number;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
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

function mergeHours(loaded: DashboardWorkingHourDto[], bizRows: BizHourRow[]): HourRow[] {
  const base = defaultHours();
  const map = new Map(loaded.map((h) => [h.dayOfWeek, h]));
  const bizMap = new Map(bizRows.map((h) => [h.dayOfWeek, h]));
  return base.map((d) => {
    const l = map.get(d.dayOfWeek);
    const biz = bizMap.get(d.dayOfWeek);
    const row: HourRow = l
      ? {
          dayOfWeek: l.dayOfWeek,
          isClosed: l.isClosed,
          startTime: l.startTime ?? '09:00',
          endTime: l.endTime ?? '17:00',
        }
      : d;
    // If the business is closed on this day, force the provider closed too
    if (biz?.isClosed) return { ...row, isClosed: true };
    return row;
  });
}

/**
 * Returns a Hebrew error string if any open provider row falls outside business hours,
 * or null when the payload is valid.
 */
function validateAgainstBiz(hours: HourRow[], bizRows: BizHourRow[]): string | null {
  const bizMap = new Map(bizRows.map((h) => [h.dayOfWeek, h]));
  for (const h of hours) {
    if (h.isClosed) continue;
    const biz = bizMap.get(h.dayOfWeek);
    if (!biz || biz.isClosed) {
      const dayName = HEBREW_DAY_ABBR[h.dayOfWeek] ?? String(h.dayOfWeek);
      return `ביום ${dayName} העסק סגור — לא ניתן להגדיר שעות לנותן השירות`;
    }
    if (h.startTime < (biz.startTime ?? '') || h.endTime > (biz.endTime ?? '')) {
      return `שעות הפעילות של נותן השירות חייבות להיות בתוך שעות הפעילות של העסק (${biz.startTime ?? ''}–${biz.endTime ?? ''})`;
    }
  }
  return null;
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
  bizHour: BizHourRow | undefined;
  onChange: (patch: Partial<HourRow>) => void;
  canMutate: boolean;
}

function DayRow({ row, bizHour, onChange, canMutate }: DayRowProps) {
  const dayName = HEBREW_DAY_ABBR[row.dayOfWeek] ?? String(row.dayOfWeek);
  const bizClosed = bizHour?.isClosed ?? false;
  // Provider can't be open when business is closed
  const toggleDisabled = !canMutate || bizClosed;
  const isOpen = !row.isClosed && !bizClosed;

  const minTime = bizHour && !bizHour.isClosed ? (bizHour.startTime ?? undefined) : undefined;
  const maxTime = bizHour && !bizHour.isClosed ? (bizHour.endTime   ?? undefined) : undefined;

  return (
    <div className="space-y-2.5 border-b border-border py-3.5 last:border-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground">{dayName}</span>
          {bizHour && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {bizClosed
                ? 'העסק סגור ביום זה'
                : `שעות העסק: ${bizHour.startTime ?? ''}–${bizHour.endTime ?? ''}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {isOpen ? 'פתוח' : 'סגור'}
          </span>
          <DayToggle
            checked={isOpen}
            onChange={() => onChange({ isClosed: !row.isClosed })}
            disabled={toggleDisabled}
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
              min={minTime}
              max={row.endTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              disabled={!canMutate}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <span className="shrink-0 text-sm text-muted-foreground">—</span>
            <input
              type="time"
              value={row.endTime}
              min={row.startTime}
              max={maxTime}
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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProvidersSkeleton() {
  return (
    <div className="space-y-3 pt-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-18 animate-pulse rounded-2xl bg-muted" />
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
  const [bizHours, setBizHours]   = useState<BizHourRow[]>([]);
  const [isDirty, setIsDirty]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  // Open animation
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Fetch business hours + provider hours in parallel when the sheet opens
  const providerId = provider?.id ?? null;
  useEffect(() => {
    if (!open || !businessId || !providerId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setIsDirty(false);

    Promise.all([
      fetchBusinessWorkingHours(businessId, () => getTokenRef.current()).catch(() => [] as DashboardWorkingHourDto[]),
      fetchServiceProviderWorkingHours(businessId, providerId, () => getTokenRef.current()),
    ])
      .then(([biz, prov]) => {
        if (!cancelled) {
          const bizRows: BizHourRow[] = biz.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            startTime: h.startTime ?? null,
            endTime: h.endTime ?? null,
          }));
          setBizHours(bizRows);
          setHours(mergeHours(prov, bizRows));
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
    setSaveError(null);
    setHours((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setIsDirty(true);
  }

  async function handleSave() {
    if (!businessId || !provider) return;

    // Client-side containment guard (only when biz hours are loaded)
    if (bizHours.length > 0) {
      const err = validateAgainstBiz(hours, bizHours);
      if (err) {
        setSaveError(err);
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

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
      setHours(mergeHours(updated, bizHours));
      setIsDirty(false);
      showToast('שעות הצוות נשמרו בהצלחה');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.message.includes('within business hours')) {
        setSaveError('שעות הפעילות של נותן השירות חייבות להיות בתוך שעות הפעילות של העסק');
      } else {
        const isConflict =
          err instanceof ApiError && (err.status === 409 || err.status === 400);
        showToast(
          isConflict
            ? 'לא ניתן לשמור — קיימים תורים מתוכננים בשעות שנסגרו'
            : 'שגיאה בשמירת שעות הצוות, נסה שוב',
          5000,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open && !visible) return null;

  const showFooter = canMutate && !loading && !loadError;
  const bizMap = new Map(bizHours.map((h) => [h.dayOfWeek, h]));

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
                    bizHour={bizMap.get(row.dayOfWeek)}
                    onChange={(patch) => updateDay(row.dayOfWeek, patch)}
                    canMutate={canMutate}
                  />
                ))}
              </div>

              {saveError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{saveError}</p>
                </div>
              )}

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
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness, currentBusinessId: businessId } = useBusiness();

  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const { message: toastMessage, showToast } = useMobileToast();

  // Providers via TanStack Query (cache shared with calendar/team/services tabs).
  const {
    providers: allProviders,
    loading,
    error: loadError,
    refetch,
  } = useAppServiceProviders(businessId);

  // Only active providers are shown in the picker.
  const providers = allProviders.filter((p) => p.isActive);

  const [selectedProvider, setSelectedProvider] =
    useState<DashboardServiceProviderDto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const businessName = currentBusiness?.business.name ?? '';

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <MobilePageHeader
        title="שעות צוות"
        icon={Users}
        subtitle={businessName}
        backHref="/app/settings"
      >
        <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
          הגדרת שעות עבודה אישיות לכל נותן שירות, בתוך שעות הפעילות הכלליות של העסק.
        </p>
      </MobilePageHeader>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-4">
        {loading ? (
          <ProvidersSkeleton />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <button
              onClick={refetch}
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
            <p className="max-w-50 text-center text-xs text-muted-foreground">
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
      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
