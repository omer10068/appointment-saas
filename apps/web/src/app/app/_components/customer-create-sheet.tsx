'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CreateCustomerPayload } from '@appointment/contracts';
import { ApiError, createDashboardCustomer } from '@/lib/api';
import { BottomSheet } from './primitives/bottom-sheet';

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
  'w-full h-10 px-3 rounded-xl text-[16px] bg-gray-100 dark:bg-gray-800 outline-none ' +
  'text-gray-800 dark:text-gray-200 placeholder:text-sm placeholder:text-gray-400';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  /** Called immediately on successful creation, before the close animation. */
  onCreated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerCreateSheet({
  open,
  businessId,
  getToken,
  onClosed,
  onCreated,
}: Props) {
  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [notes, setNotes]           = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form fields when sheet opens.
  useEffect(() => {
    if (!open) return;
    setFullName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(triggerClose: () => void) {
    if (!businessId || !fullName.trim() || !phone.trim() || submitting) return;

    const payload: CreateCustomerPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    setError(null);

    try {
      await createDashboardCustomer(businessId, payload, getToken);
      onCreated();
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

  const isValid = !!fullName.trim() && !!phone.trim();

  return (
    <BottomSheet
      open={open}
      onClosed={onClosed}
      lockClose={submitting}
      ariaLabel="לקוח חדש"
    >
      {(triggerClose) => (
        <>
          {/* Handle + header */}
          <div className="flex shrink-0 flex-col px-5 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-lg font-extrabold text-foreground">לקוח חדש</h2>
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
            <FormField label="שם מלא *">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="שם הלקוח"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="טלפון *">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-123-4567"
                dir="ltr"
                className={`${INPUT_CLASS} text-left`}
              />
            </FormField>

            <FormField label="אימייל">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
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
          </div>

          {/* Error + submit */}
          <div className="px-4 pt-4 pb-8 shrink-0 flex flex-col gap-3">
            {error && (
              <p className="text-[13px] text-red-500 text-center">{error}</p>
            )}
            <button
              onClick={() => handleSubmit(triggerClose)}
              disabled={!isValid || submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמור לקוח'}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
