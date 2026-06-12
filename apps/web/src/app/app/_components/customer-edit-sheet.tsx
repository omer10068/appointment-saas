'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { CustomerStatus, DashboardCustomerDto } from '@appointment/contracts';
import {
  ApiError,
  updateDashboardCustomer,
  updateDashboardCustomerStatus,
} from '@/lib/api';
import { formatIsraeliPhone } from '../_lib/calendar.utils';
import { BottomSheet } from './primitives/bottom-sheet';

// ─── Status segment config ────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: CustomerStatus; label: string }> = [
  { value: 'ACTIVE',   label: 'פעיל' },
  { value: 'BLOCKED',  label: 'חסום' },
  { value: 'ARCHIVED', label: 'ארכיון' },
];

const STATUS_SELECTED: Record<CustomerStatus, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOCKED:  'bg-red-50     text-red-600     border-red-200',
  ARCHIVED: 'bg-muted      text-muted-foreground border-border',
};

const STATUS_UNSELECTED = 'bg-card text-muted-foreground border-border';

// ─── Form primitives ──────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-border bg-muted px-4 py-3 text-[16px] ' +
  'text-foreground placeholder:text-sm placeholder:text-muted-foreground outline-none';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  customer: DashboardCustomerDto | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
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
  const [fullName, setFullName]             = useState('');
  const [phone, setPhone]                   = useState('');
  const [email, setEmail]                   = useState('');
  const [notes, setNotes]                   = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus>('ACTIVE');
  const [error, setError]                   = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName);
    setPhone(formatIsraeliPhone(customer.phone));
    setEmail(customer.email ?? '');
    setNotes(customer.notes ?? '');
    setSelectedStatus(customer.status);
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.businessCustomerId]);

  async function handleSave(triggerClose: () => void) {
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

  const open = customer !== null;
  const isValid = !!fullName.trim() && !!phone.trim();

  return (
    <BottomSheet
      open={open}
      onClosed={onClosed}
      lockClose={submitting}
      ariaLabel="עריכת לקוח"
    >
      {(triggerClose) => {
        if (!customer) return null;
        return (
          <>
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
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 disabled:opacity-40"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <div className="space-y-5 pb-2">

                <FormField label="שם מלא" required>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="שם הלקוח"
                    autoComplete="off"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField label="טלפון" required>
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
                    className={`${INPUT_CLASS} h-auto resize-none leading-relaxed`}
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
                            'flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-[0.98]',
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
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
              {error && (
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="flex-1 text-right text-[13px] leading-snug text-red-600">{error}</p>
                </div>
              )}
              <button
                onClick={() => handleSave(triggerClose)}
                disabled={!isValid || submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמור שינויים'}
              </button>
            </div>
          </>
        );
      }}
    </BottomSheet>
  );
}
