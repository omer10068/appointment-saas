'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChevronRight, Scissors, Search, UsersRound, X } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import type { DashboardBusinessUserDto, DashboardServiceDto, DashboardServiceProviderDto } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import {
  fetchDashboardBusinessUsers,
  fetchDashboardServiceProviders,
  fetchDashboardServices,
} from '@/lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { ProviderCreateSheet } from './provider-create-sheet';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { ProviderEditSheet } from './provider-edit-sheet';
import { LAYOUT } from '../_lib/calendar.design';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatServiceCount(count: number): string {
  if (count === 0) return 'ללא שירותים';
  if (count === 1) return 'שירות אחד';
  return `${count} שירותים`;
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

// ─── Provider row ─────────────────────────────────────────────────────────────

interface ProviderRowProps {
  provider: DashboardServiceProviderDto;
  serviceCount: number;
  onClick: () => void;
}

function ProviderRow({ provider, serviceCount, onClick }: ProviderRowProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className={[
          'flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-right',
          'shadow-sm shadow-foreground/5 transition active:scale-[0.99]',
          !provider.isActive ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
          {provider.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{provider.displayName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Scissors className="size-3.5" aria-hidden="true" />
            {formatServiceCount(serviceCount)}
          </p>
        </div>
        <StatusBadge active={provider.isActive} />
      </button>
    </li>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="size-12 shrink-0 rounded-full bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3.5 w-28 rounded-lg bg-muted" />
        <div className="h-3 w-16 rounded-lg bg-muted" />
      </div>
      <div className="h-5 w-14 shrink-0 rounded-full bg-muted" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2.5 px-5 pt-4">
      {[0, 1, 2, 3].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Read-only provider detail sheet (MEMBER) ─────────────────────────────────

interface ProviderDetailSheetProps {
  provider: DashboardServiceProviderDto | null;
  serviceMap: Record<string, string>;
  onClosed: () => void;
}

function ProviderDetailSheet({ provider, serviceMap, onClosed }: ProviderDetailSheetProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!provider) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  if (!provider) return null;

  const serviceNames = provider.serviceIds
    .map((id) => serviceMap[id])
    .filter((name): name is string => !!name);

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
          'absolute bottom-0 left-0 right-0 flex flex-col',
          'max-h-[88%]',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + header */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-extrabold text-foreground">פרטי ספק שירות</h2>
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
          {/* Centered avatar + name */}
          <div className="flex flex-col items-center pb-6 pt-2">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
              {provider.displayName.charAt(0).toUpperCase()}
            </div>
            <p className="mt-3 text-lg font-extrabold text-foreground">{provider.displayName}</p>
            <div className="mt-2">
              <StatusBadge active={provider.isActive} />
            </div>
          </div>

          {/* Services panel */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">שירותים</p>
            {serviceNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">ללא שירותים</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {serviceNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                  >
                    <Scissors className="size-3" aria-hidden="true" />
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileTeamShell() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useDashboardBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const canMutate    =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';
  const isOwner      = currentBusiness?.role === 'OWNER';

  // ── Data fetch ────────────────────────────────────────────────────────────────

  const [providers, setProviders]           = useState<DashboardServiceProviderDto[]>([]);
  const [services, setServices]             = useState<DashboardServiceDto[]>([]);
  const [serviceMap, setServiceMap]         = useState<Record<string, string>>({});
  const [businessUsers, setBusinessUsers]   = useState<DashboardBusinessUserDto[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [retryKey, setRetryKey]             = useState(0);

  function retry() { setRetryKey((k) => k + 1); }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchDashboardServiceProviders(businessId, () => getTokenRef.current()),
      fetchDashboardServices(businessId, () => getTokenRef.current()),
      isOwner
        ? fetchDashboardBusinessUsers(businessId, () => getTokenRef.current())
        : Promise.resolve<DashboardBusinessUserDto[]>([]),
    ])
      .then(([providerDtos, serviceDtos, userDtos]) => {
        if (cancelled) return;
        setProviders(providerDtos);
        const allServices = serviceDtos as DashboardServiceDto[];
        setServices(allServices);
        const map: Record<string, string> = {};
        for (const s of allServices) {
          map[s.id] = s.name;
        }
        setServiceMap(map);
        setBusinessUsers(userDtos);
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת הצוות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId, retryKey, isOwner]);

  // ── Search ────────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? providers.filter((p) =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : providers;

  // ── Selected provider (for detail / edit sheet) ───────────────────────────────

  const [selectedProvider, setSelectedProvider] =
    useState<DashboardServiceProviderDto | null>(null);

  // ── Create sheet ──────────────────────────────────────────────────────────────

  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const eligibleUsers = businessUsers.filter(
    (u) => u.status === 'ACTIVE' && !u.hasServiceProviderProfile,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MobilePhoneFrame dir="rtl">
      {/* Header */}
      <div className="flex-none border-b border-border bg-card px-5 pb-4 pt-9">
        <button
          onClick={() => router.push('/settings')}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-opacity active:opacity-60"
          aria-label="חזרה"
        >
          <ChevronRight className="size-4" />
          <span>חזרה</span>
        </button>
        <div className="mt-2 flex items-start justify-between">
          <div>
            {businessName && (
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {businessName}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              צוות
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {providers.length} נותני שירות
            </p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <UsersRound className="size-5" />
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם"
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
      </div>

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
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין אנשי צוות עדיין'}
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
              <h2 className="text-base font-bold text-foreground">אנשי צוות</h2>
            </div>
            <ul className="space-y-2.5">
              {filtered.map((provider) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  serviceCount={provider.serviceIds.length}
                  onClick={() => setSelectedProvider(provider)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <CalendarBottomNav activeKey="settings" />

      {/* FAB — OWNER only (MANAGER cannot access business users list) */}
      {isOwner && <MobileFab onClick={() => setShowCreateSheet(true)} ariaLabel="הוסף חבר צוות" />}

      {/* Detail sheet — MEMBER only */}
      {!canMutate && (
        <ProviderDetailSheet
          provider={selectedProvider}
          serviceMap={serviceMap}
          onClosed={() => setSelectedProvider(null)}
        />
      )}

      {/* Edit sheet — OWNER/MANAGER */}
      {canMutate && (
        <ProviderEditSheet
          provider={selectedProvider}
          services={services}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setSelectedProvider(null)}
          onSaved={retry}
        />
      )}

      {/* Create sheet — OWNER only */}
      {isOwner && (
        <ProviderCreateSheet
          open={showCreateSheet}
          eligibleUsers={eligibleUsers}
          services={services}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setShowCreateSheet(false)}
          onCreated={retry}
        />
      )}
    </MobilePhoneFrame>
  );
}
