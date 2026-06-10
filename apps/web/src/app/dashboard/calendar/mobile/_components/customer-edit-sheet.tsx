'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CustomerStatus, DashboardCustomerDto } from '@appointment/contracts';
import {
  ApiError,
  updateDashboardCustomer,
  updateDashboardCustomerStatus,
} from '../../../../../lib/api';
import { formatIsraeliPhone } from '../_lib/calendar.utils';

// ─── Status segment config ────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: CustomerStatus; label: string }> = [
  { value: 'ACTIVE',   label: 'פעיל' },
  { value: 'BLOCKED',  label: 'חסום' },
  { value: 'ARCHIVED', label: 'ארכיון' },
];

const STATUS_SELECTED: Record<CustomerStatus, string> = {
  ACTIVE:   'bg-green-100 text-green-700 border-green-200',
  BLOCKED:  'bg-orange-100 text-orange-700 border-orange-200',
  ARCHIVED: 'bg-gray-200 text-gray-600 border-gray-300',
};

const STATUS_UNSELECTED =
  'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700';

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full h-10 px-3 rounded-xl text-[14px] bg-gray-100 dark:bg-gray-800 outline-none ' +
  'text-gray-800 dark:text-gray-200 placeholder:text-gray-400';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  customer: DashboardCustomerDto | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  /** Called immediately on successful save, before the close animation. */
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerEditSheet({
  customer,
  businessId,
  getToken,
  onClosed,
  onSaved,
}: Props) {
  const [visible, setVisible]               = useState(false);
  const isClosingRef                        = useRef(false);

  const [fullName, setFullName]             = useState('');
  const [phone, setPhone]                   = useState('');
  const [email, setEmail]                   = useState('');
  const [notes, setNotes]                   = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus>('ACTIVE');
  const [error, setError]                   = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);

  // Populate fields and animate in whenever a different customer is opened.
  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName);
    // Display in local format so the user sees 050-... not +972...
    setPhone(formatIsraeliPhone(customer.phone));
    setEmail(customer.email ?? '');
    setNotes(customer.notes ?? '');
    setSelectedStatus(customer.status);
    setError(null);
    setSubmitting(false);
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

  async function handleSave() {
    if (!businessId || !customer || !fullName.trim() || !phone.trim() || submitting) return;

    const emailValue = email.trim() || null;
    const notesValue = notes.trim() || null;

    const originalFormattedPhone = formatIsraeliPhone(customer.phone);
    const fieldsChanged =
      fullName.trim() !== customer.fullName ||
      phone.trim() !== originalFormattedPhone ||
      emailValue !== customer.email ||
      notesValue !== customer.notes;

    const statusChanged = selectedStatus !== customer.status;

    // Nothing to save — just close.
    if (!fieldsChanged && !statusChanged) {
      triggerClose();
      return;
    }

    setSubmitting(true);
    setError(null);

    const calls: Promise<unknown>[] = [];

    if (fieldsChanged) {
      calls.push(
        updateDashboardCustomer(
          businessId,
          customer.businessCustomerId,
          {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: emailValue,
            notes: notesValue,
          },
          getToken,
        ),
      );
    }

    if (statusChanged) {
      calls.push(
        updateDashboardCustomerStatus(
          businessId,
          customer.businessCustomerId,
          { status: selectedStatus },
          getToken,
        ),
      );
    }

    try {
      await Promise.all(calls);
      onSaved();
      triggerClose();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'מספר הטלפון כבר קיים במערכת'
          : 'שגיאה בשמירה, נסה שוב',
      );
      setSubmitting(false);
    }
  }

  if (!customer) return null;

  const isValid = !!fullName.trim() && !!phone.trim();

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={submitting ? undefined : triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'max-h-[88%] flex flex-col',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + header */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">עריכת לקוח</h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{customer.fullName}</p>
            </div>
            <button
              onClick={submitting ? undefined : triggerClose}
              aria-label="סגור"
              disabled={submitting}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 disabled:opacity-40"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-4">
          <FormField label="שם מלא">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם הלקוח"
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="טלפון">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className={`${INPUT_CLASS} text-left`}
            />
          </FormField>

          <FormField label="אימייל">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className={`${INPUT_CLASS} text-left`}
            />
          </FormField>

          <FormField label="הערות">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות לגבי הלקוח..."
              rows={3}
              className={`${INPUT_CLASS} h-auto py-2.5 resize-none leading-relaxed`}
            />
          </FormField>

          {/* Status segmented control */}
          <FormField label="סטטוס">
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => {
                const isSelected = value === selectedStatus;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedStatus(value)}
                    className={[
                      'flex-1 h-9 rounded-xl text-[13px] font-medium border transition-colors',
                      isSelected ? STATUS_SELECTED[value] : STATUS_UNSELECTED,
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </FormField>

        </div>

        {/* Error + submit */}
        <div className="px-4 pt-4 pb-8 shrink-0 flex flex-col gap-3">
          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid || submitting}
            className="w-full h-12 rounded-2xl bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}
