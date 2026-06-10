'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { DashboardServiceDto } from '@appointment/contracts';
import {
  updateDashboardService,
  updateDashboardServiceStatus,
} from '../../../../../lib/api';

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
  service: DashboardServiceDto | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  /** Called immediately on successful save, before the close animation. */
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceEditSheet({
  service,
  businessId,
  getToken,
  onClosed,
  onSaved,
}: Props) {
  const [visible, setVisible]         = useState(false);
  const isClosingRef                  = useRef(false);

  const [name, setName]               = useState('');
  const [durationStr, setDurationStr] = useState('');
  const [priceStr, setPriceStr]       = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive]       = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // Populate fields and animate in whenever a different service is opened.
  useEffect(() => {
    if (!service) return;
    setName(service.name);
    setDurationStr(String(service.durationMinutes));
    setPriceStr(service.priceCents !== null ? String(service.priceCents / 100) : '');
    setDescription(service.description ?? '');
    setIsActive(service.isActive);
    setError(null);
    setSubmitting(false);
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

  const durationNum = parseInt(durationStr, 10);
  const durationValid = !isNaN(durationNum) && durationNum >= 5 && durationNum <= 480;
  const isValid = !!name.trim() && durationValid;

  async function handleSave() {
    if (!businessId || !service || !isValid || submitting) return;

    const parsedPrice = priceStr.trim() !== '' ? parseFloat(priceStr) : NaN;
    const priceCents = !isNaN(parsedPrice) ? Math.round(parsedPrice * 100) : null;
    const descriptionValue = description.trim() || null;

    const fieldsChanged =
      name.trim() !== service.name ||
      durationNum !== service.durationMinutes ||
      priceCents !== service.priceCents ||
      descriptionValue !== service.description;

    const statusChanged = isActive !== service.isActive;

    if (!fieldsChanged && !statusChanged) {
      triggerClose();
      return;
    }

    setSubmitting(true);
    setError(null);

    const calls: Promise<unknown>[] = [];

    if (fieldsChanged) {
      calls.push(
        updateDashboardService(
          businessId,
          service.id,
          {
            name: name.trim(),
            durationMinutes: durationNum,
            priceCents,
            description: descriptionValue,
          },
          getToken,
        ),
      );
    }

    if (statusChanged) {
      calls.push(
        updateDashboardServiceStatus(businessId, service.id, isActive, getToken),
      );
    }

    try {
      await Promise.all(calls);
      onSaved();
      triggerClose();
    } catch {
      setError('שגיאה בשמירה, נסה שוב');
      setSubmitting(false);
    }
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
              <h2 className="text-lg font-extrabold text-foreground">עריכת שירות</h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{service.name}</p>
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
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-4 pb-2">
          <FormField label="שם שירות">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="משך (דקות)">
            <input
              type="number"
              inputMode="numeric"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
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

          <FormField label="תיאור">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של השירות..."
              rows={3}
              className={`${INPUT_CLASS} h-auto py-2.5 resize-none leading-relaxed`}
            />
          </FormField>

          <FormField label="סטטוס">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={[
                  'flex-1 h-9 rounded-xl text-[13px] font-medium border transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700',
                ].join(' ')}
              >
                פעיל
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={[
                  'flex-1 h-9 rounded-xl text-[13px] font-medium border transition-colors',
                  !isActive
                    ? 'bg-gray-200 text-gray-600 border-gray-300'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700',
                ].join(' ')}
              >
                לא פעיל
              </button>
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
