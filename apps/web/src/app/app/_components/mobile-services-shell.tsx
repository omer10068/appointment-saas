'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { AlignLeft, Clock3, Scissors, Search, Tag, X } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import type { DashboardServiceDto } from '@appointment/contracts';
import { useBusiness } from '@/app/app/_providers/business/useBusiness';
import { useAppServices } from '../_hooks/useAppServices';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { ServiceCreateSheet } from './service-create-sheet';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { ServiceEditSheet } from './service-edit-sheet';
import { BottomSheet } from './primitives/bottom-sheet';
import { LAYOUT } from '../_lib/calendar.design';
import { appKeys } from '../_lib/query-keys';

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

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground',
      ].join(' ')}
    >
      <span
        className={[
          'size-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-muted-foreground',
        ].join(' ')}
      />
      {active ? 'פעיל' : 'לא פעיל'}
    </span>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: DashboardServiceDto;
  onClick: () => void;
}

function ServiceRow({ service, onClick }: ServiceRowProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className={[
          'flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-right',
          'shadow-sm shadow-foreground/5 transition active:scale-[0.99]',
          !service.isActive ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Scissors className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{service.name}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {formatDuration(service.durationMinutes)}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Tag className="size-3.5" aria-hidden="true" />
              {formatPrice(service.priceCents)}
            </span>
          </div>
        </div>
        <StatusBadge active={service.isActive} />
      </button>
    </li>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="size-11 shrink-0 rounded-2xl bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3.5 w-32 rounded-lg bg-muted" />
        <div className="h-3 w-24 rounded-lg bg-muted" />
      </div>
      <div className="h-5 w-14 shrink-0 rounded-full bg-muted" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2.5 px-5 pt-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Read-only service detail sheet (MEMBER) ──────────────────────────────────

interface ServiceDetailSheetProps {
  service: DashboardServiceDto | null;
  onClosed: () => void;
}

function ServiceDetailSheet({ service, onClosed }: ServiceDetailSheetProps) {
  const open = service !== null;

  return (
    <BottomSheet open={open} onClosed={onClosed} ariaLabel="פרטי שירות">
      {(triggerClose) => {
        if (!service) return null;
        return (
          <>
            {/* Handle + header */}
            <div className="flex shrink-0 flex-col px-5 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-lg font-extrabold text-foreground">פרטי שירות</h2>
                <button
                  onClick={triggerClose}
                  aria-label="סגור"
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
              {/* Centered icon + name */}
              <div className="flex flex-col items-center pb-6 pt-2">
                <div className="flex size-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
                  <Scissors className="size-9" aria-hidden="true" />
                </div>
                <p className="mt-3 text-lg font-extrabold text-foreground">{service.name}</p>
                <div className="mt-2">
                  <StatusBadge active={service.isActive} />
                </div>
              </div>

              {/* Info panel */}
              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">משך</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatDuration(service.durationMinutes)}
                  </span>
                </div>
                <div
                  className={[
                    'flex items-center gap-3 px-4 py-3.5',
                    service.description ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <Tag className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">מחיר</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatPrice(service.priceCents)}
                  </span>
                </div>
                {service.description && (
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <AlignLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm text-muted-foreground">תיאור</span>
                    <span className="max-w-[55%] text-right text-sm font-medium leading-snug text-foreground whitespace-pre-wrap">
                      {service.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      }}
    </BottomSheet>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileServicesShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const canMutate    =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  const queryClient = useQueryClient();

  function invalidateServices() {
    if (!businessId) return;
    void queryClient.invalidateQueries({ queryKey: appKeys.services(businessId) });
  }

  // ── Services fetch ────────────────────────────────────────────────────────────

  const { services, loading, error, refetch: retry } = useAppServices(businessId);

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
      <header className="flex-none bg-background px-5 pb-4 pt-9">
        <div className="flex items-start justify-between">
          <div>
            {businessName && (
              <p className="text-sm font-semibold text-primary">
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
          <Search size={16} className="shrink-0 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם שירות"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
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
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 16 }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={retry} className="text-sm font-medium text-primary">
              נסה שוב
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12">
            <p className="text-center text-sm text-muted-foreground">
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין שירותים עדיין'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm font-medium text-primary"
              >
                נקה חיפוש
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 pt-4">
            <div className="mb-3">
              <h2 className="text-base font-bold text-foreground">רשימת שירותים</h2>
            </div>
            <ul className="space-y-2.5">
              {filtered.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onClick={() => setSelectedService(service)}
                />
              ))}
            </ul>
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
          onSaved={invalidateServices}
        />
      )}

      {/* Create sheet — OWNER/MANAGER */}
      {canMutate && (
        <ServiceCreateSheet
          open={showCreateSheet}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setShowCreateSheet(false)}
          onCreated={invalidateServices}
        />
      )}
    </MobilePhoneFrame>
  );
}
