'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, Users, X, Phone, Mail, AlignLeft, Ban } from 'lucide-react';
import { MobileFab } from './mobile-fab';
import type { AppointmentStatus as ContractsStatus, CustomerStatus, DashboardCustomerDto } from '@appointment/contracts';
import { useBusiness } from '@/app/(app)/_providers/business/useBusiness';
import { fetchDashboardCustomers, updateDashboardAppointmentStatus } from '@/lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { CustomerCreateSheet } from './customer-create-sheet';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { CustomerEditSheet } from './customer-edit-sheet';
import { CustomerAppointmentHistory } from './customer-appointment-history';
import { CalendarAppointmentSheet } from './calendar-appointment-sheet';
import { formatIsraeliPhone } from '../_lib/calendar.utils';
import { LAYOUT } from '../_lib/calendar.design';
import { mapDtoToAppointment } from '../_lib/calendar.mappers';
import type { Appointment } from '../_lib/calendar.types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_BADGE_STYLE: Record<CustomerStatus, { bg: string; text: string; dot: string }> = {
  ACTIVE:   { bg: 'bg-emerald-50', text: 'text-emerald-700',      dot: 'bg-emerald-500' },
  BLOCKED:  { bg: 'bg-red-50',     text: 'text-red-600',          dot: 'bg-red-500' },
  ARCHIVED: { bg: 'bg-muted',      text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' },
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE:   'פעיל',
  BLOCKED:  'חסום',
  ARCHIVED: 'ארכיון',
};

function getInitial(name: string): string {
  return (name.trim()[0] ?? '').toUpperCase();
}

// ─── Customer row ─────────────────────────────────────────────────────────────

function CustomerRow({ customer, onClick }: { customer: DashboardCustomerDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-right shadow-sm shadow-foreground/5 transition active:scale-[0.99]"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <span className="text-sm font-bold">{getInitial(customer.fullName)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{customer.fullName}</p>
          {customer.status === 'BLOCKED' && (
            <Ban className="size-3.5 shrink-0 text-red-500" aria-hidden="true" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
          {formatIsraeliPhone(customer.phone)}
        </p>
      </div>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2 px-5 pt-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5">
          <div className="size-11 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 rounded-full bg-muted" />
            <div className="h-3 w-20 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({ icon, value, ltr }: { icon: ReactNode; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="text-sm font-semibold text-foreground" dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}

// ─── Customer detail sheet ────────────────────────────────────────────────────

interface CustomerDetailSheetProps {
  customer: DashboardCustomerDto | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  timezone: string;
  canEdit: boolean;
  historyRefreshKey: number;
  onSelectHistoryAppointment: (apt: Appointment) => void;
  onEdit: () => void;
  onClosed: () => void;
}

function CustomerDetailSheet({
  customer,
  businessId,
  getToken,
  timezone,
  canEdit,
  historyRefreshKey,
  onSelectHistoryAppointment,
  onEdit,
  onClosed,
}: CustomerDetailSheetProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  useEffect(() => {
    if (!customer) return;
    isClosingRef.current = false;
    setHistoryCount(null);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.businessCustomerId]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  if (!customer) return null;

  const badge = STATUS_BADGE_STYLE[customer.status];

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

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
            <h2 className="text-lg font-extrabold text-foreground">פרטי לקוח</h2>
            <button
              onClick={triggerClose}
              aria-label="סגור"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Fixed: avatar + contact panel */}
        <div className="shrink-0 space-y-5 px-5 pb-4 pt-2">
          {/* Avatar + name + status */}
          <div className="flex flex-col items-center text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <span className="text-2xl font-bold">{getInitial(customer.fullName)}</span>
            </div>
            <p className="mt-3 text-lg font-extrabold text-foreground">{customer.fullName}</p>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}
              >
                <span className={`size-1.5 rounded-full ${badge.dot}`} />
                {STATUS_LABEL[customer.status]}
              </span>
            </div>
          </div>

          {/* Contact panel */}
          <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4">
            <ContactRow
              icon={<Phone className="size-4" />}
              value={formatIsraeliPhone(customer.phone)}
              ltr
            />
            {customer.email && (
              <ContactRow icon={<Mail className="size-4" />} value={customer.email} ltr />
            )}
            {customer.notes && (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-primary">
                  <AlignLeft className="size-4" />
                </span>
                <span className="flex-1 whitespace-pre-wrap text-sm leading-snug text-muted-foreground">
                  {customer.notes}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed: history heading */}
        <div className="shrink-0 border-t border-border px-5 pb-2 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">היסטוריית תורים</p>
            {historyCount !== null && (
              <span className="text-xs font-medium text-muted-foreground">
                {historyCount} תורים
              </span>
            )}
          </div>
        </div>

        {/* Scrollable: history list only */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 pt-2">
          <CustomerAppointmentHistory
            businessId={businessId}
            businessCustomerId={customer.businessCustomerId}
            getToken={getToken}
            timezone={timezone}
            onCountReady={setHistoryCount}
            refreshKey={historyRefreshKey}
            onSelect={(dto) => onSelectHistoryAppointment(mapDtoToAppointment(dto, new Map()))}
          />
        </div>

        {/* Footer */}
        {canEdit ? (
          <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
            <button
              onClick={onEdit}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98]"
            >
              עריכת לקוח
            </button>
          </div>
        ) : (
          <div className="pb-8 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileCustomersShell() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const { currentBusiness } = useBusiness();
  const businessName = currentBusiness?.business.name;
  const businessId   = currentBusiness?.business.id ?? null;
  const canMutate    =
    currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'MANAGER';

  // ── Customers fetch ──────────────────────────────────────────────────────────

  const [customers, setCustomers] = useState<DashboardCustomerDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  function retry() { setRetryKey((k) => k + 1); }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDashboardCustomers(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) {
          setCustomers(data);
          // Sync the open detail sheet with fresh data after any refresh.
          setSelectedCustomer((prev) =>
            prev ? (data.find((c) => c.businessCustomerId === prev.businessCustomerId) ?? prev) : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת לקוחות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId, retryKey]);

  // ── Search ────────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? customers.filter((c) => {
        const q = searchQuery.toLowerCase();
        if (c.fullName.toLowerCase().includes(q)) return true;
        if (c.email && c.email.toLowerCase().includes(q)) return true;
        if (/^[\d+\-\s]+$/.test(q)) {
          const queryDigits = q.replace(/\D/g, '');
          if (queryDigits.length > 0) {
            const phoneDigits = formatIsraeliPhone(c.phone).replace(/\D/g, '');
            if (phoneDigits.includes(queryDigits)) return true;
          }
        }
        return false;
      })
    : customers;

  // ── Grouped by initial letter ─────────────────────────────────────────────────

  const grouped = filtered.reduce<Record<string, DashboardCustomerDto[]>>((acc, c) => {
    const letter = getInitial(c.fullName) || '#';
    (acc[letter] ??= []).push(c);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'he'));

  // ── Sheet state ───────────────────────────────────────────────────────────────

  const [selectedCustomer, setSelectedCustomer]           = useState<DashboardCustomerDto | null>(null);
  const [isEditing, setIsEditing]                         = useState(false);
  const [showCreateSheet, setShowCreateSheet]             = useState(false);
  const [selectedHistoryApt, setSelectedHistoryApt]       = useState<Appointment | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey]         = useState(0);

  async function handleHistoryStatusUpdate(
    appointmentId: string,
    newStatus: ContractsStatus,
  ): Promise<void> {
    if (!businessId) return;
    await updateDashboardAppointmentStatus(
      businessId,
      appointmentId,
      { status: newStatus },
      () => getTokenRef.current(),
    );
    setHistoryRefreshKey((k) => k + 1);
  }

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
              לקוחות
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {customers.length} לקוחות
            </p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Users className="size-5" />
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <Search size={16} className="shrink-0 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון"
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
        style={{ paddingBottom: LAYOUT.bottomNavHeightPx + 88 }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={retry} className="text-sm font-medium text-primary">
              נסה שוב
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12">
            <p className="text-center text-sm text-muted-foreground">
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין לקוחות עדיין'}
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
          <div className="space-y-5 px-5 pb-4 pt-4">
            {letters.map((letter) => (
              <section key={letter}>
                <p className="mb-2 px-1 text-xs font-bold text-primary">{letter}</p>
                <ul className="space-y-2">
                  {grouped[letter].map((customer) => (
                    <li key={customer.businessCustomerId}>
                      <CustomerRow
                        customer={customer}
                        onClick={() => setSelectedCustomer(customer)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* FAB — OWNER/MANAGER only */}
      {canMutate && <MobileFab onClick={() => setShowCreateSheet(true)} ariaLabel="הוסף לקוח" />}

      <CalendarBottomNav activeKey="customers" />

      {/* Detail sheet — all roles; always opens on row tap */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        businessId={businessId}
        getToken={() => getTokenRef.current()}
        timezone={currentBusiness?.business.timezone ?? 'Asia/Jerusalem'}
        canEdit={canMutate}
        historyRefreshKey={historyRefreshKey}
        onSelectHistoryAppointment={setSelectedHistoryApt}
        onEdit={() => setIsEditing(true)}
        onClosed={() => { setSelectedCustomer(null); setIsEditing(false); }}
      />

      {/* Appointment detail sheet — opens when tapping a history item */}
      <CalendarAppointmentSheet
        appointment={selectedHistoryApt}
        timezone={currentBusiness?.business.timezone ?? 'Asia/Jerusalem'}
        canMutate={canMutate}
        onStatusUpdate={handleHistoryStatusUpdate}
        onClosed={() => setSelectedHistoryApt(null)}
      />

      {/* Edit sheet — OWNER/MANAGER; layers on top of detail sheet */}
      {isEditing && canMutate && (
        <CustomerEditSheet
          customer={selectedCustomer}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => setIsEditing(false)}
          onSaved={retry}
        />
      )}

      {/* Create sheet — OWNER/MANAGER */}
      {canMutate && (
        <CustomerCreateSheet
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
