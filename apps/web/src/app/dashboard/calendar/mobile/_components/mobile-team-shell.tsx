'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, X } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import type { DashboardBusinessUserDto, DashboardServiceDto, DashboardServiceProviderDto } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import {
  fetchDashboardBusinessUsers,
  fetchDashboardServiceProviders,
  fetchDashboardServices,
} from '../../../../../lib/api';
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

// ─── Provider row ─────────────────────────────────────────────────────────────

interface ProviderRowProps {
  provider: DashboardServiceProviderDto;
  serviceCount: number;
  onClick: () => void;
}

function ProviderRow({ provider, serviceCount, onClick }: ProviderRowProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 py-3.5',
        'border-b border-gray-100 dark:border-gray-800',
        'text-right transition-colors active:bg-black/3 dark:active:bg-white/3',
        !provider.isActive ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Initials avatar */}
      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
          {provider.displayName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Name + service count */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
          {provider.displayName}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
          {formatServiceCount(serviceCount)}
        </p>
      </div>

      {/* Active/inactive badge */}
      <span
        className={[
          'text-[10px] font-medium px-2 py-0.5 rounded-full leading-none shrink-0',
          provider.isActive
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-100 text-gray-500',
        ].join(' ')}
      >
        {provider.isActive ? 'פעיל' : 'לא פעיל'}
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 dark:border-gray-800">
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-4 w-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 animate-pulse flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Read-only provider detail sheet ─────────────────────────────────────────

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
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <span className="text-[15px] font-bold">
                  {provider.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-foreground truncate">
                  {provider.displayName}
                </p>
                <span
                  className={[
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    provider.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500',
                  ].join(' ')}
                >
                  {provider.isActive ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
            </div>
            <button
              onClick={triggerClose}
              aria-label="סגור"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Services section */}
        <div className="px-4 flex flex-col gap-2">
          <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">
            שירותים
          </p>
          {serviceNames.length === 0 ? (
            <p className="text-[13px] text-gray-400 dark:text-gray-500">ללא שירותים</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {serviceNames.map((name) => (
                <span
                  key={name}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pb-8 pt-5" />
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileTeamShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useDashboardBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const canMutate    =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';
  const isOwner      = currentBusiness?.role === 'OWNER';
  const initials = businessName
    ? businessName.split(/[-_\s]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    : '?';

  // ── Data fetch ────────────────────────────────────────────────────────────────

  const [providers, setProviders]       = useState<DashboardServiceProviderDto[]>([]);
  const [services, setServices]         = useState<DashboardServiceDto[]>([]);
  const [serviceMap, setServiceMap]     = useState<Record<string, string>>({});
  const [businessUsers, setBusinessUsers] = useState<DashboardBusinessUserDto[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [retryKey, setRetryKey]         = useState(0);

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

  // ── Selected provider (for detail sheet) ─────────────────────────────────────

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
        <div className="flex items-start justify-between">
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
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground ring-1 ring-primary/10">
            {initials}
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
            placeholder="חיפוש לפי שם"
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
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין אנשי צוות עדיין'}
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
            {filtered.map((provider) => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                serviceCount={provider.serviceIds.length}
                onClick={() => setSelectedProvider(provider)}
              />
            ))}
          </div>
        )}
      </div>

      <CalendarBottomNav activeKey="team" />

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
