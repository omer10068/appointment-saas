'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import type { DashboardAvailabilityExceptionDto } from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import { deleteAvailabilityException } from '@/lib/api';
import { useAppServiceProviders } from '../_hooks/useAppServiceProviders';
import { useAppExceptions } from '../_hooks/useAppExceptions';
import { AddExceptionSheet } from './exception-add-sheet';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { MobileToast } from './mobile-toast';
import { useMobileToast } from '../_lib/useMobileToast';
import { appKeys } from '../_lib/query-keys';
import { toFriendlyName } from '../_lib/calendar.utils';
import { MobilePageHeader } from './mobile-page-header';

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Normalise both "YYYY-MM-DD" and full ISO strings ("2026-06-11T00:00:00.000Z")
// to the date-only part so downstream helpers always receive a safe input.
function toDatePart(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatExceptionDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // Slice to YYYY-MM-DD first — prevents "2026-06-11T00:00:00.000ZT12:00:00" invalid dates.
    const d = new Date(`${toDatePart(dateStr)}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatMonthHeader(yearMonth: string): string {
  try {
    const d = new Date(`${yearMonth}-15T12:00:00`);
    if (isNaN(d.getTime())) return yearMonth;
    return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  } catch {
    return yearMonth;
  }
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type Tab = 'future' | 'past';

function FilterTabs({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex-none px-5 pb-3 pt-4">
      <div className="flex rounded-2xl bg-muted p-1">
        {(['future', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={[
              'flex-1 rounded-xl py-2 text-sm font-semibold transition-colors',
              active === t
                ? 'bg-card text-foreground shadow-sm shadow-foreground/5'
                : 'text-muted-foreground',
            ].join(' ')}
          >
            {t === 'future' ? 'עתידיות' : 'עבר'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Exception card ───────────────────────────────────────────────────────────

interface ExceptionCardProps {
  ex: DashboardAvailabilityExceptionDto;
  providerName: string | null;
  canMutate: boolean;
  isDeleting: boolean;
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

function ExceptionCard({
  ex,
  providerName,
  canMutate,
  isDeleting,
  confirmDelete,
  onRequestDelete,
  onCancelDelete,
  onDelete,
}: ExceptionCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-foreground/5">
      <div className="flex items-start gap-4">
        {/* Content — right side in RTL (first child = physical right) */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Row 1: date + scope badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold text-foreground">
              {formatExceptionDate(ex.date)}
            </span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {providerName ?? 'כל העסק'}
            </span>
          </div>

          {/* Row 2: status */}
          {ex.isClosed ? (
            <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              סגור כל היום
            </span>
          ) : (
            <span className="text-xs font-medium text-foreground" dir="ltr">
              {ex.startTime ?? '--:--'} — {ex.endTime ?? '--:--'}
            </span>
          )}

          {/* Row 3: reason */}
          {ex.reason && (
            <p className="text-xs leading-snug text-muted-foreground">{ex.reason}</p>
          )}
        </div>

        {/* Delete action — left side in RTL (last child = physical left) */}
        {canMutate && (
          <div className="flex shrink-0 self-start items-center gap-2 pt-0.5">
            {confirmDelete ? (
              <>
                <button
                  onClick={onCancelDelete}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  ביטול
                </button>
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {isDeleting ? '...' : 'מחק'}
                </button>
              </>
            ) : (
              <button
                onClick={onRequestDelete}
                aria-label="מחק חריגה"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition active:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pt-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-19 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileExceptionsShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness, currentBusinessId: businessId } =
    useBusiness();

  const canMutate =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const timezone =
    currentBusiness?.business.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { message: toastMessage, showToast } = useMobileToast();

  const queryClient = useQueryClient();

  function invalidateExceptions() {
    if (!businessId) return;
    void queryClient.invalidateQueries({ queryKey: appKeys.exceptions(businessId) });
  }

  // ── Data state ─────────────────────────────────────────────────────────────

  // Providers via TanStack Query (cache shared with calendar/team/services tabs).
  const {
    providers: allProviders,
    loading: providersLoading,
    error: providersError,
    refetch: refetchProviders,
  } = useAppServiceProviders(businessId);

  // Only active providers are needed for display.
  const providers = allProviders.filter((p) => p.isActive);

  // Exceptions via TanStack Query.
  const {
    exceptions,
    loading: exceptionsLoading,
    error: exceptionsError,
    refetch: refetchExceptions,
  } = useAppExceptions(businessId);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab, setTab]                         = useState<Tab>('future');
  const [addSheetOpen, setAddSheetOpen]       = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);

  // Composed loading / error / retry — used by the error-state "נסה שוב" button
  // to recover from initial load failure (refetches both providers and exceptions).
  const loading   = providersLoading || exceptionsLoading;
  const loadError = providersError ?? exceptionsError;

  function retryAll() {
    refetchProviders();
    refetchExceptions();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!businessId) return;
    setDeletingId(id);
    try {
      await deleteAvailabilityException(businessId, id, () => getTokenRef.current());
      setConfirmDeleteId(null);
      invalidateExceptions();
    } catch {
      showToast('שגיאה במחיקת החריגה, נסה שוב', 4000);
    } finally {
      setDeletingId(null);
    }
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const today = getTodayStr();

  const sorted  = [...exceptions].sort((a, b) => toDatePart(a.date).localeCompare(toDatePart(b.date)));
  const future  = sorted.filter((e) => toDatePart(e.date) >= today);
  // Past: reverse-chronological so the most-recent past exception is at the top
  const past    = sorted.filter((e) => toDatePart(e.date) < today).reverse();

  // Group future exceptions by "YYYY-MM" for month sections
  const groupedFuture: { month: string; items: DashboardAvailabilityExceptionDto[] }[] = [];
  {
    const monthMap = new Map<string, DashboardAvailabilityExceptionDto[]>();
    for (const ex of future) {
      const key = toDatePart(ex.date).slice(0, 7);
      const group = monthMap.get(key) ?? [];
      if (!monthMap.has(key)) monthMap.set(key, group);
      group.push(ex);
    }
    for (const [month, items] of monthMap) {
      groupedFuture.push({ month, items });
    }
  }

  const isEmpty = tab === 'future' ? future.length === 0 : past.length === 0;

  const providerNameOf = (id: string | null): string | null =>
    id ? (providers.find((p) => p.id === id)?.displayName ?? null) : null;

  const businessName = currentBusiness?.business.name ?? '';

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <MobilePageHeader
        title="חריגות וחופשות"
        icon={CalendarOff}
        subtitle={businessName ? toFriendlyName(businessName) : undefined}
        backHref="/app/settings"
      >
        <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
          חגים, חופשות וסגירות חד-פעמיות שמחליפות את שעות הפתיחה הרגילות.
        </p>
      </MobilePageHeader>

      {/* ── Filter tabs — stays fixed, outside scroll ─────────────────────── */}
      {!loading && !loadError && currentBusiness && (
        <FilterTabs active={tab} onChange={setTab} />
      )}

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <button
              onClick={retryAll}
              className="text-sm font-medium text-primary"
            >
              נסה שוב
            </button>
          </div>
        ) : !currentBusiness ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">לא נבחר עסק</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <CalendarOff className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {tab === 'future' ? 'אין חריגות עתידיות' : 'אין חריגות בעבר'}
            </p>
          </div>
        ) : tab === 'future' ? (
          /* Future: grouped by month */
          <div className="space-y-5">
            {groupedFuture.map(({ month, items }) => (
              <div key={month}>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatMonthHeader(month)}
                </p>
                <div className="space-y-3">
                  {items.map((ex) => (
                    <ExceptionCard
                      key={ex.id}
                      ex={ex}
                      providerName={providerNameOf(ex.serviceProviderId)}
                      canMutate={canMutate}
                      isDeleting={deletingId === ex.id}
                      confirmDelete={confirmDeleteId === ex.id}
                      onRequestDelete={() => setConfirmDeleteId(ex.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      onDelete={() => void handleDelete(ex.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Past: flat, newest-first */
          <div className="space-y-3">
            {past.map((ex) => (
              <ExceptionCard
                key={ex.id}
                ex={ex}
                providerName={providerNameOf(ex.serviceProviderId)}
                canMutate={canMutate}
                isDeleting={deletingId === ex.id}
                confirmDelete={confirmDeleteId === ex.id}
                onRequestDelete={() => setConfirmDeleteId(ex.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => void handleDelete(ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add button — outside scroll, above bottom nav ─────────────────── */}
      {canMutate && !loading && !loadError && currentBusiness && (
        <div className="flex-none px-5 pb-24 pt-3">
          <button
            onClick={() => setAddSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:opacity-80"
          >
            <Plus className="size-4" />
            הוסף חריגה
          </button>
        </div>
      )}

      <AddExceptionSheet
        open={addSheetOpen}
        businessId={businessId ?? null}
        providers={providers}
        timezone={timezone}
        getToken={() => getTokenRef.current()}
        onClosed={() => setAddSheetOpen(false)}
        onCreated={() => {
          invalidateExceptions();
          setTab('future');
        }}
      />

      <MobileToast message={toastMessage} />
      {/* No tab highlighted — exceptions is a settings page, not a main nav tab */}
      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
