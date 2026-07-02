'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { CreateServicePayload } from '@appointment/contracts';
import { createDashboardService } from '@/lib/api';
import { BottomSheet } from './primitives/bottom-sheet';

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
  const router = useRouter();

  const [name, setName]                 = useState('');
  const [durationStr, setDurationStr]   = useState('');
  const [priceStr, setPriceStr]         = useState('');
  const [description, setDescription]   = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [created, setCreated]           = useState(false);

  // Reset form fields when sheet opens.
  useEffect(() => {
    if (!open) return;
    setName('');
    setDurationStr('');
    setPriceStr('');
    setDescription('');
    setError(null);
    setSubmitting(false);
    setCreated(false);
  }, [open]);

  const durationNum   = parseInt(durationStr, 10);
  const durationValid = !isNaN(durationNum) && durationNum >= 5 && durationNum <= 480;
  const isValid       = !!name.trim() && durationValid;

  async function handleSubmit() {
    if (!businessId || !isValid || submitting) return;

    const parsedPrice = priceStr.trim() !== '' ? parseFloat(priceStr) : NaN;
    const priceCents  = !isNaN(parsedPrice) ? Math.round(parsedPrice * 100) : null;

    // New services are always created inactive — a service can only become
    // active once it has at least one active service provider assigned.
    const payload: CreateServicePayload = {
      name: name.trim(),
      durationMinutes: durationNum,
      priceCents,
      description: description.trim() || null,
      isActive: false,
    };

    setSubmitting(true);
    setError(null);

    try {
      await createDashboardService(businessId, payload, getToken);
      onCreated();
      setCreated(true);
    } catch {
      setError('שגיאה בשמירה, נסה שוב');
      setSubmitting(false);
    }
  }

  function goToTeam(triggerClose: () => void) {
    triggerClose();
    router.push('/app/settings/team');
  }

  return (
    <BottomSheet
      open={open}
      onClosed={onClosed}
      lockClose={submitting}
      ariaLabel="שירות חדש"
    >
      {(triggerClose) => (
        <>
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

          {created ? (
            <>
              {/* Success state — guide the user toward provider assignment */}
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-800">
                    השירות נוצר כלא פעיל.
                  </p>
                  <p className="text-[13px] leading-relaxed text-emerald-700">
                    כדי להפעיל אותו, יש לשייך אותו לפחות לנותן שירות פעיל אחד.
                  </p>
                </div>
              </div>
              <div className="shrink-0 space-y-2 border-t border-border bg-card px-5 pb-7 pt-4">
                <button
                  onClick={() => goToTeam(triggerClose)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98]"
                >
                  מעבר לצוות לשיוך נותן שירות
                </button>
                <button
                  onClick={triggerClose}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition active:scale-[0.98]"
                >
                  סגירה
                </button>
              </div>
            </>
          ) : (
            <>
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
                        className={`${INPUT_CLASS} text-right`}
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
                        className={`${INPUT_CLASS} text-right`}
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

                  <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted px-3.5 py-3">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="flex-1 text-right text-[13px] leading-snug text-muted-foreground">
                      השירות ייווצר כלא פעיל. כדי להפעיל אותו, יש לשייך אותו לפחות לנותן שירות פעיל אחד.
                    </p>
                  </div>

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
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}
