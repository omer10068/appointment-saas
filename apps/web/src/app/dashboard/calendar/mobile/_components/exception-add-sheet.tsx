'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, Loader2, X } from 'lucide-react';
import type {
  CreateAvailabilityExceptionPayload,
  DashboardServiceProviderDto,
} from '@appointment/contracts';
import { ApiError, createAvailabilityException } from '@/lib/api';
import { CalendarMonthPicker } from './calendar-month-picker';

// ─── Form helpers ─────────────────────────────────────────────────────────────

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

// Local toggle — absolute left/right avoids RTL transform issues in Tailwind v4.
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
          checked ? 'right-1' : 'left-1',
        ].join(' ')}
      />
    </button>
  );
}

// ─── Date display helper ─────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  businessId: string | null;
  providers: DashboardServiceProviderDto[];
  timezone: string;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  onCreated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddExceptionSheet({
  open,
  businessId,
  providers,
  timezone,
  getToken,
  onClosed,
  onCreated,
}: Props) {
  const [visible, setVisible]         = useState(false);
  const isClosingRef                  = useRef(false);

  const [date, setDate]               = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [providerId, setProviderId]   = useState('');
  const [isClosed, setIsClosed]       = useState(true);
  const [startTime, setStartTime]     = useState('09:00');
  const [endTime, setEndTime]         = useState('17:00');
  const [reason, setReason]           = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate('');
    setCalendarOpen(false);
    setProviderId('');
    setIsClosed(true);
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
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

  const isValid = !!date;

  async function handleSubmit() {
    if (!businessId || !isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload: CreateAvailabilityExceptionPayload = {
      date,
      serviceProviderId: providerId || null,
      isClosed,
      startTime: isClosed ? null : startTime,
      endTime: isClosed ? null : endTime,
      reason: reason.trim() || null,
    };

    try {
      await createAvailabilityException(businessId, payload, getToken);
      onCreated();
      triggerClose();
    } catch (err) {
      const isConflict =
        err instanceof ApiError && (err.status === 409 || err.status === 400);
      setError(
        isConflict
          ? 'לא ניתן לשמור — קיימים תורים מתוכננים בזמן שנחסם'
          : 'שגיאה בשמירת החריגה, נסה שוב',
      );
      setSubmitting(false);
    }
  }

  if (!open && !visible) return null;

  // Helpers for CalendarMonthPicker ↔ date string conversion
  function parseDateStrToDate(ds: string): Date {
    const [y, m, d] = ds.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
  }

  function handleDateSelect(d: Date) {
    setDate(d.toISOString().slice(0, 10));
  }

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
            <h2 className="text-lg font-extrabold text-foreground">חריגה חדשה</h2>
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

            {/* Date */}
            <FormField label="תאריך" required>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className={[
                  INPUT_CLASS,
                  'flex items-center justify-between gap-2 text-right',
                  date ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                <span>{date ? formatDisplayDate(date) : 'בחר תאריך'}</span>
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </FormField>

            {/* Provider */}
            <FormField label="נותן שירות">
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">כל העסק</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Full-day closed toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                סגור כל היום
              </span>
              <Toggle checked={isClosed} onChange={() => setIsClosed((v) => !v)} />
            </div>

            {/* Custom hours — only when not full-day closed */}
            {!isClosed && (
              <div className="flex items-end gap-2.5">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">פתיחה</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <span className="pb-3.5 text-sm text-muted-foreground">—</span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">סגירה</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <FormField label="סיבה (אופציונלי)">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="לדוגמה: חופשת קיץ"
                rows={2}
                className={`${INPUT_CLASS} h-auto resize-none leading-relaxed`}
              />
            </FormField>

          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
          {error && (
            <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <p className="flex-1 text-right text-[13px] leading-snug text-red-600">
                {error}
              </p>
            </div>
          )}
          <button
            onClick={() => void handleSubmit()}
            disabled={!isValid || submitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמירה'}
          </button>
        </div>
      </div>

      {/* Date picker — z-70 floats above the sheet */}
      <CalendarMonthPicker
        open={calendarOpen}
        selectedDate={date ? parseDateStrToDate(date) : new Date()}
        timezone={timezone}
        onSelectDate={handleDateSelect}
        onClosed={() => setCalendarOpen(false)}
      />
    </div>
  );
}
