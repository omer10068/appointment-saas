'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Scissors, Search, X } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import type { DashboardServiceDto } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import { fetchDashboardServices } from '../../../../../lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { ServiceCreateSheet } from './service-create-sheet';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { ServiceEditSheet } from './service-edit-sheet';
import { LAYOUT } from '../_lib/calendar.design';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דק׳`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} שע׳`;
  return `${h}:${String(m).padStart(2, '0')} שע׳`;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return 'ללא מחיר';
  const amount = cents / 100;
  return `₪${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

// ─── Service row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: DashboardServiceDto;
  onClick: () => void;
}

function ServiceRow({ service, onClick }: ServiceRowProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 py-3.5',
        'border-b border-gray-100 dark:border-gray-800',
        'text-right transition-colors active:bg-black/3 dark:active:bg-white/3',
        !service.isActive ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Duration chip */}
      <div className="min-w-13 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center shrink-0 px-1">
        <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300 tabular-nums leading-none">
          {formatDuration(service.durationMinutes)}
        </span>
      </div>

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
          {service.name}
        </p>
        <p className={[
          'text-[12px] leading-tight mt-0.5',
          service.priceCents === null
            ? 'text-gray-300 dark:text-gray-600'
            : 'text-gray-400 dark:text-gray-500',
        ].join(' ')}>
          {formatPrice(service.priceCents)}
        </p>
      </div>

      {/* Active/inactive badge */}
      <span
        className={[
          'text-[10px] font-medium px-2 py-0.5 rounded-full leading-none shrink-0',
          service.isActive
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-100 text-gray-500',
        ].join(' ')}
      >
        {service.isActive ? 'פעיל' : 'לא פעיל'}
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 dark:border-gray-800">
      <div className="min-w-13 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 animate-pulse flex flex-col">
      {[0, 1, 2, 3, 4].map((i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Read-only service detail sheet ──────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 text-right min-w-0">
        {children}
      </span>
    </div>
  );
}

interface ServiceDetailSheetProps {
  service: DashboardServiceDto | null;
  onClosed: () => void;
}

function ServiceDetailSheet({ service, onClosed }: ServiceDetailSheetProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!service) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  if (!service) return null;

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + header */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div className="flex items-center justify-between pb-2">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-foreground truncate">{service.name}</h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {formatDuration(service.durationMinutes)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={[
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  service.isActive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500',
                ].join(' ')}
              >
                {service.isActive ? 'פעיל' : 'לא פעיל'}
              </span>
              <button
                onClick={triggerClose}
                aria-label="סגור"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-4 flex flex-col gap-4">
          <DetailRow label="משך">
            <span className="tabular-nums">{formatDuration(service.durationMinutes)}</span>
          </DetailRow>

          <DetailRow label="מחיר">
            {formatPrice(service.priceCents)}
          </DetailRow>

          {service.description && (
            <DetailRow label="תיאור">
              <span className="text-gray-600 dark:text-gray-300 leading-snug whitespace-pre-wrap">
                {service.description}
              </span>
            </DetailRow>
          )}
        </div>

        <div className="pb-8 pt-5" />
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileServicesShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useDashboardBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const canMutate    =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';
  // ── Services fetch ───────────────────────────────────────────────────────────

  const [services, setServices] = useState<DashboardServiceDto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  function retry() { setRetryKey((k) => k + 1); }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDashboardServices(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setServices(data);
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת שירותים');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId, retryKey]);

  // ── Search ────────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? services.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  // ── Sheet state ───────────────────────────────────────────────────────────────

  const [selectedService, setSelectedService] = useState<DashboardServiceDto | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header */}
      <div className="flex-none border-b border-border bg-card px-5 pb-4 pt-9">
        <div className="flex items-start justify-between">
          <div>
            {businessName && (
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {businessName}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              שירותים
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {services.length} שירותים
            </p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Scissors className="size-5" />
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <Search
            size={16}
            className="shrink-0 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם שירות"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="נקה חיפוש"
              className="shrink-0 p-0.5 text-muted-foreground transition active:opacity-60"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 16 }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[14px] text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={retry}
              className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
            >
              נסה שוב
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 px-6">
            <p className="text-[14px] text-gray-400 dark:text-gray-500 text-center">
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין שירותים עדיין'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
              >
                נקה חיפוש
              </button>
            )}
          </div>
        ) : (
          <div className="px-4">
            {filtered.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onClick={() => setSelectedService(service)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — OWNER/MANAGER only */}
      {canMutate && <MobileFab onClick={() => setShowCreateSheet(true)} ariaLabel="הוסף שירות" />}

      <CalendarBottomNav activeKey="services" />

      {/* Detail sheet — MEMBER only */}
      {!canMutate && (
        <ServiceDetailSheet
          service={selectedService}
          onClosed={() => setSelectedService(null)}
        />
      )}

      {/* Edit sheet — OWNER/MANAGER */}
      {canMutate && (
        <ServiceEditSheet
          service={selectedService}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setSelectedService(null)}
          onSaved={retry}
        />
      )}

      {/* Create sheet — OWNER/MANAGER */}
      {canMutate && (
        <ServiceCreateSheet
          open={showCreateSheet}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setShowCreateSheet(false)}
          onCreated={retry}
        />
      )}
    </MobilePhoneFrame>
  );
}
