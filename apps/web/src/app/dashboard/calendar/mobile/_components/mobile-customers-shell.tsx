'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Plus, Search, X } from 'lucide-react';
import type { CustomerStatus, DashboardCustomerDto } from '@appointment/contracts';
import { useDashboardBusiness } from '../../../_business/useDashboardBusiness';
import { fetchDashboardCustomers } from '../../../../../lib/api';
import { CalendarBottomNav } from './calendar-bottom-nav';
import { CustomerCreateSheet } from './customer-create-sheet';
import { CustomerEditSheet } from './customer-edit-sheet';
import { CustomerAppointmentHistory } from './customer-appointment-history';
import { formatIsraeliPhone } from '../_lib/calendar.utils';
import { LAYOUT } from '../_lib/calendar.design';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CustomerStatus, string> = {
  ACTIVE:   'bg-green-50 text-green-700',
  BLOCKED:  'bg-orange-50 text-orange-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE:   'פעיל',
  BLOCKED:  'חסום',
  ARCHIVED: 'ארכיון',
};

// ─── Customer row ─────────────────────────────────────────────────────────────

interface CustomerRowProps {
  customer: DashboardCustomerDto;
  onClick: () => void;
}

function CustomerRow({ customer, onClick }: CustomerRowProps) {
  const isSecondary = customer.status !== 'ACTIVE';

  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 py-3.5',
        'border-b border-gray-100 dark:border-gray-800',
        'text-right transition-colors active:bg-black/3 dark:active:bg-white/3',
        isSecondary ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Initials avatar */}
      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
          {customer.fullName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
          {customer.fullName}
        </p>
        {customer.email && (
          <p
            className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight"
            dir="ltr"
          >
            {customer.email}
          </p>
        )}
      </div>

      {/* Status badge + phone */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full leading-none ${STATUS_BADGE[customer.status]}`}
        >
          {STATUS_LABEL[customer.status]}
        </span>
        <span
          className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums"
          dir="ltr"
        >
          {formatIsraeliPhone(customer.phone)}
        </span>
      </div>
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
        <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-4 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
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

// ─── Read-only detail sheet ───────────────────────────────────────────────────

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

interface CustomerDetailSheetProps {
  customer: DashboardCustomerDto | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  timezone: string;
  canEdit: boolean;
  onEdit: () => void;
  onClosed: () => void;
}

function CustomerDetailSheet({
  customer,
  businessId,
  getToken,
  timezone,
  canEdit,
  onEdit,
  onClosed,
}: CustomerDetailSheetProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!customer) return;
    isClosingRef.current = false;
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

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      <div
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl',
          'max-h-[85dvh] flex flex-col',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header card */}
        <div className="bg-gray-50 dark:bg-gray-800 mx-4 mt-2 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <span className="text-[15px] font-bold text-gray-600 dark:text-gray-300">
                {customer.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                {customer.fullName}
              </p>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[customer.status]}`}
              >
                {STATUS_LABEL[customer.status]}
              </span>
            </div>
          </div>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="mr-3 p-1.5 rounded-full text-gray-400 hover:bg-black/5 active:bg-black/10 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-4">
            <DetailRow label="טלפון">
              <span dir="ltr">{formatIsraeliPhone(customer.phone)}</span>
            </DetailRow>
            {customer.email && (
              <DetailRow label="אימייל">
                <span dir="ltr">{customer.email}</span>
              </DetailRow>
            )}
            {customer.notes && (
              <DetailRow label="הערות">
                <span className="text-gray-600 dark:text-gray-300 leading-snug whitespace-pre-wrap">
                  {customer.notes}
                </span>
              </DetailRow>
            )}
          </div>

          <div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />

          <CustomerAppointmentHistory
            businessId={businessId}
            businessCustomerId={customer.businessCustomerId}
            getToken={getToken}
            timezone={timezone}
          />
        </div>

        {/* Fixed bottom — edit button for OWNER/MANAGER, padding for MEMBER */}
        {canEdit ? (
          <div className="px-4 pt-3 pb-8 shrink-0">
            <button
              onClick={onEdit}
              className="w-full h-12 rounded-2xl bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white text-[15px] font-semibold transition-opacity active:opacity-75"
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

  const { currentBusiness } = useDashboardBusiness();
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
        if (!cancelled) setCustomers(data);
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
  // Strip non-digit chars from both query and phone so that "0521120018" matches
  // a phone displayed as "052-112-0018".

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? customers.filter((c) => {
        const q = searchQuery.toLowerCase();

        if (c.fullName.toLowerCase().includes(q)) return true;
        if (c.email && c.email.toLowerCase().includes(q)) return true;

        // Phone: only search by digits when the query looks like a phone number
        // (digits, dashes, spaces, +). A mixed query like "054גגג" must NOT strip
        // the letters and then accidentally match unrelated phones.
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

  // ── Sheet state ───────────────────────────────────────────────────────────────

  const [selectedCustomer, setSelectedCustomer] = useState<DashboardCustomerDto | null>(null);
  const [isEditing, setIsEditing]               = useState(false);
  const [showCreateSheet, setShowCreateSheet]   = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col overflow-hidden',
        'bg-gray-50 dark:bg-gray-950',
        'md:inset-auto md:top-1/2 md:left-1/2',
        'md:-translate-x-1/2 md:-translate-y-1/2',
        'md:w-107.5 md:h-[90dvh]',
        'md:rounded-4xl md:shadow-2xl md:overflow-hidden',
      ].join(' ')}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex-none px-6 pt-5 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {businessName && (
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
            {businessName}
          </p>
        )}
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 leading-tight">
          לקוחות
        </h1>

        {/* Search bar */}
        <div className="mt-3 relative">
          <Search
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון"
            className="w-full h-9 pr-9 pl-9 rounded-xl text-[13px] bg-gray-100 dark:bg-gray-800 outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="נקה חיפוש"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 active:text-gray-800"
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
              {searchQuery ? 'לא נמצאו תוצאות לחיפוש זה' : 'אין לקוחות עדיין'}
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
            {filtered.map((customer) => (
              <CustomerRow
                key={customer.businessCustomerId}
                customer={customer}
                onClick={() => setSelectedCustomer(customer)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — OWNER/MANAGER only */}
      {canMutate && (
        <button
          onClick={() => setShowCreateSheet(true)}
          aria-label="הוסף לקוח"
          className="absolute left-4 w-14 h-14 rounded-full bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white shadow-lg flex items-center justify-center active:opacity-75 transition-opacity z-10"
          style={{ bottom: LAYOUT.fabBottomOffset }}
        >
          <Plus size={24} />
        </button>
      )}

      <CalendarBottomNav activeKey="customers" />

      {/* Detail sheet — all roles; always opens on row tap */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        businessId={businessId}
        getToken={() => getTokenRef.current()}
        timezone={currentBusiness?.business.timezone ?? 'Asia/Jerusalem'}
        canEdit={canMutate}
        onEdit={() => setIsEditing(true)}
        onClosed={() => { setSelectedCustomer(null); setIsEditing(false); }}
      />

      {/* Edit sheet — OWNER/MANAGER; layers on top of detail sheet */}
      {isEditing && canMutate && (
        <CustomerEditSheet
          customer={selectedCustomer}
          businessId={businessId}
          getToken={() => getTokenRef.current()}
          onClosed={() => { setIsEditing(false); setSelectedCustomer(null); }}
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
    </div>
  );
}
