'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { CreateServicePayload } from '@appointment/contracts';
import { createDashboardService } from '../../../../../lib/api';

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
  'text-foreground placeholder:text-muted-foreground outline-none';

const STATUS_ACTIVE_SELECTED   = 'bg-emerald-50 text-emerald-700 border-emerald-200';
const STATUS_INACTIVE_SELECTED = 'bg-muted text-muted-foreground border-border';
const STATUS_UNSELECTED        = 'bg-card text-muted-foreground border-border';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  onCreated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceCreateSheet({
  open,
  businessId,
  getToken,
  onClosed,
  onCreated,
}: Props) {
  const [visible, setVisible]           = useState(false);
  const isClosingRef                    = useRef(false);

  const [name, setName]                 = useState('');
  const [durationStr, setDurationStr]   = useState('');
  const [priceStr, setPriceStr]         = useState('');
  const [description, setDescription]   = useState('');
  const [isActive, setIsActive]         = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDurationStr('');
    setPriceStr('');
    setDescription('');
    setIsActive(true);
    setError(null);
    setSubmitting(false);
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  const durationNum   = parseInt(durationStr, 10);
  const durationValid = !isNaN(durationNum) && durationNum >= 5 && durationNum <= 480;
  const isValid       = !!name.trim() && durationValid;

  async function handleSubmit() {
    if (!businessId || !isValid || submitting) return;

    const parsedPrice = priceStr.trim() !== '' ? parseFloat(priceStr) : NaN;
    const priceCents  = !isNaN(parsedPrice) ? Math.round(parsedPrice * 100) : null;

    const payload: CreateServicePayload = {
      name: name.trim(),
      durationMinutes: durationNum,
      priceCents,
      description: description.trim() || null,
      isActive,
    };

    setSubmitting(true);
    setError(null);

    try {
      await createDashboardService(businessId, payload, getToken);
      onCreated();
      triggerClose();
    } catch {
      setError('שגיאה בשמירה, נסה שוב');
      setSubmitting(false);
    }
  }

  if (!open && !visible) return null;

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
            <h2 className="text-lg font-extrabold text-foreground">שירות חדש</h2>
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
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <div className="space-y-5 pb-2">

            <FormField label="שם השירות" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: תספורת גברים"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="משך (דקות)" required>
                <input
                  type="number"
                  inputMode="numeric"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  placeholder="30"
                  min={5}
                  max={480}
                  dir="ltr"
                  className={`${INPUT_CLASS} text-left`}
                />
              </FormField>

              <FormField label="מחיר (₪)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  placeholder="ללא מחיר"
                  min={0}
                  dir="ltr"
                  className={`${INPUT_CLASS} text-left`}
                />
              </FormField>
            </div>

            <FormField label="תיאור">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור קצר של השירות..."
                rows={3}
                className={`${INPUT_CLASS} h-auto resize-none leading-relaxed`}
              />
            </FormField>

            <FormField label="זמינות">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={[
                    'flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                    isActive ? STATUS_ACTIVE_SELECTED : STATUS_UNSELECTED,
                  ].join(' ')}
                >
                  פעיל
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={[
                    'flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                    !isActive ? STATUS_INACTIVE_SELECTED : STATUS_UNSELECTED,
                  ].join(' ')}
                >
                  מושבת
                </button>
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
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמירה'}
          </button>
        </div>
      </div>
    </div>
  );
}
