'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, Check, Search, AlertCircle, CalendarDays } from 'lucide-react';
import { useDashboardI18n } from '../../../_i18n/useDashboardI18n';
import { formatDate, formatIsraeliPhone } from '../_lib/calendar.utils';
import { CalendarDatePicker } from './calendar-date-picker';
import { useCreateAppointmentForm } from '../_lib/useCreateAppointmentForm';
import type { Service, ServiceProvider } from '../_lib/calendar.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClosed: () => void;
  /**
   * Called immediately on successful appointment creation (before close animation).
   * Receives the date the appointment was created on so the calendar can navigate there.
   */
  onCreated?: (appointmentDate: Date) => void;
  businessId: string | null;
  timezone: string;
  initialDate: Date;
  services: Service[];
  serviceProviders: ServiceProvider[];
  currentBusinessUserId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarCreateSheet({
  open,
  onClosed,
  onCreated,
  businessId,
  timezone,
  initialDate,
  services,
  serviceProviders,
  currentBusinessUserId,
}: Props) {
  const dict = useDashboardI18n();
  const tForm = dict.appointmentForm;

  // ── Animation ────────────────────────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  // ── Form state ────────────────────────────────────────────────────────────────
  const form = useCreateAppointmentForm({
    businessId,
    timezone,
    initialDate,
    serviceProviders,
    currentBusinessUserId,
  });

  // Stable refs so the open-transition effect doesn't stale-close over form/initialDate.
  const formRef = useRef(form);
  formRef.current = form;
  const initialDateRef = useRef(initialDate);
  initialDateRef.current = initialDate;

  // ── Customer search ───────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('');

  // Whether the month calendar panel is expanded.
  const [showCalendar, setShowCalendar] = useState(false);

  const MAX_VISIBLE = 5;

  const allMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return form.customers;

    // Only parse query as phone digits when it looks like a phone number.
    const looksLikePhone = /^[\d+\-\s]+$/.test(q);
    const qDigits = looksLikePhone ? q.replace(/\D/g, '') : '';
    let qPhone = qDigits;
    if (qPhone.startsWith('972')) qPhone = qPhone.slice(3);
    else if (qPhone.startsWith('0')) qPhone = qPhone.slice(1);

    return form.customers.filter((c) => {
      if (c.fullName.toLowerCase().includes(q)) return true;
      if (qPhone && c.phone) {
        const phoneDigits = c.phone.replace(/\D/g, '');
        const localPhone = phoneDigits.startsWith('972') ? phoneDigits.slice(3) : phoneDigits;
        if (localPhone.includes(qPhone)) return true;
      }
      return false;
    });
  }, [form.customers, customerSearch]);

  const visibleCustomers = useMemo(() => {
    const top = allMatches.slice(0, MAX_VISIBLE);
    if (
      form.selectedCustomerId &&
      !top.some((c) => c.businessCustomerId === form.selectedCustomerId)
    ) {
      const sel = form.customers.find(
        (c) => c.businessCustomerId === form.selectedCustomerId,
      );
      if (sel) return [sel, ...top.slice(0, MAX_VISIBLE - 1)];
    }
    return top;
  }, [allMatches, form.selectedCustomerId, form.customers]);

  const hasMore = allMatches.length > MAX_VISIBLE;

  // On every open: reset all selections and clamp date to business-today if needed.
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    formRef.current.resetForm(initialDateRef.current);
    setCustomerSearch('');
    setShowCalendar(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  // ── Submit handler ────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const success = await form.submit();
    if (success) {
      onCreated?.(form.selectedDate);
      triggerClose();
    }
  }

  if (!open) return null;

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

      {/* Sheet — flex col so header/footer never get pushed off screen */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'flex flex-col',
          'max-h-[92dvh]',
          'bg-card rounded-t-[2rem] border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle — flex-none */}
        <div className="flex-none flex justify-center pt-3 pb-1">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Header — flex-none, always visible */}
        <div className="flex-none flex items-center justify-between px-5 pt-2 pb-4 border-b border-border">
          {/* Title on the right (RTL start = physical right, first child) */}
          <span className="text-lg font-extrabold text-foreground">
            {tForm.addAppointment}
          </span>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable form body — flex-1, scrolls independently */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 flex flex-col gap-5 pb-8">

            {/* ── Service ─────────────────────────────────────────────────── */}
            <FormSection label={tForm.service}>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tForm.noServices}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <ChoiceChip
                      key={s.id}
                      label={s.name}
                      selected={form.selectedServiceId === s.id}
                      onClick={() =>
                        form.selectedServiceId === s.id
                          ? form.selectService(null)
                          : form.selectService(s.id)
                      }
                    />
                  ))}
                </div>
              )}
            </FormSection>

            {/* ── Provider (shown once a service is selected) ─────────────── */}
            {form.selectedServiceId && (
              <FormSection label={tForm.staff}>
                {form.bookableProviders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין נותני שירות זמינים לשירות זה</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.bookableProviders.map((sp) => (
                      <ChoiceChip
                        key={sp.id}
                        label={sp.name}
                        selected={form.selectedProviderId === sp.id}
                        onClick={() =>
                          form.selectedProviderId === sp.id
                            ? form.selectProvider(null)
                            : form.selectProvider(sp.id)
                        }
                      />
                    ))}
                  </div>
                )}
              </FormSection>
            )}

            {/* ── Date picker ──────────────────────────────────────────────── */}
            <FormSection label="תאריך">
              {/* Trigger: icon + formatted date in a muted pill */}
              <button
                type="button"
                onClick={() => setShowCalendar((s) => !s)}
                className="flex items-center gap-2 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-right transition active:opacity-70"
              >
                <CalendarDays size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  {formatDate(form.selectedDate, timezone)}
                </span>
              </button>

              {/* Calendar panel — conditionally rendered; remounts fresh each open */}
              {showCalendar && (
                <div className="rounded-2xl border border-border bg-muted p-4 mt-2">
                  <CalendarDatePicker
                    selectedDate={form.selectedDate}
                    timezone={timezone}
                    onSelect={(date) => {
                      form.selectDate(date);
                      setShowCalendar(false);
                    }}
                  />
                </div>
              )}
            </FormSection>

            {/* ── Available slots (shown once service + provider are selected) */}
            {form.selectedServiceId && form.selectedProviderId && (
              <FormSection label="שעה">
                {form.isPastDate ? (
                  <p className="text-sm text-amber-500">לא ניתן לקבוע תור לתאריך שעבר</p>
                ) : form.isLoadingSlots ? (
                  <div className="flex justify-center py-3">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : form.slotsError ? (
                  <p className="text-sm text-red-500">{form.slotsError}</p>
                ) : form.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין שעות פנויות ביום זה</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.slots.map((slot) => (
                      <TimeChip
                        key={slot.startsAt}
                        label={slot.localStartTime}
                        selected={form.selectedSlot?.startsAt === slot.startsAt}
                        onClick={() =>
                          form.selectedSlot?.startsAt === slot.startsAt
                            ? form.selectSlot(null)
                            : form.selectSlot(slot)
                        }
                      />
                    ))}
                  </div>
                )}
              </FormSection>
            )}

            {/* ── Customer ─────────────────────────────────────────────────── */}
            <FormSection label={tForm.customer}>
              {form.isLoadingCustomers ? (
                <div className="flex justify-center py-3">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : form.customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין לקוחות פעילים</p>
              ) : (
                <div className="flex flex-col gap-2">

                  {/* Search input */}
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground pointer-events-none"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="חיפוש לפי שם או טלפון"
                      className="w-full pl-3 pr-9 py-3 rounded-2xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
                    />
                  </div>

                  {/* Results */}
                  {visibleCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      לא נמצאו לקוחות מתאימים
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {visibleCustomers.map((c) => {
                        const selected = form.selectedCustomerId === c.businessCustomerId;
                        return (
                          <button
                            key={c.businessCustomerId}
                            onClick={() =>
                              selected
                                ? form.selectCustomer(null)
                                : form.selectCustomer(c.businessCustomerId)
                            }
                            className={[
                              'flex items-center gap-3 rounded-2xl border p-2.5 w-full text-right transition',
                              selected
                                ? 'border-primary bg-accent'
                                : 'border-transparent bg-card hover:bg-muted',
                            ].join(' ')}
                          >
                            {/* Avatar — right side in RTL */}
                            <div
                              className={[
                                'size-9 rounded-full flex items-center justify-center shrink-0',
                                'text-xs font-semibold transition',
                                selected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-accent text-accent-foreground',
                              ].join(' ')}
                            >
                              {selected ? (
                                <Check size={15} strokeWidth={2.5} />
                              ) : (
                                getInitials(c.fullName)
                              )}
                            </div>

                            {/* Name + phone */}
                            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                              <span className="text-sm font-bold text-foreground truncate max-w-full leading-tight">
                                {c.fullName}
                              </span>
                              {c.phone && (
                                <span className="text-xs text-muted-foreground leading-none" dir="ltr">
                                  {formatIsraeliPhone(c.phone)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* "More results" hint */}
                  {hasMore && (
                    <p className="text-xs text-muted-foreground text-center pt-0.5">
                      יש עוד תוצאות — חפש לפי שם או טלפון לצמצום
                    </p>
                  )}

                </div>
              )}
            </FormSection>

          </div>
        </div>

        {/* Footer — flex-none, always visible */}
        <div className="flex-none px-5 py-4 border-t border-border bg-card">
          {form.submitError && (
            <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3.5 py-2.5">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-600 dark:text-red-400 leading-snug text-right flex-1">
                {form.submitError}
              </p>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!form.isFormValid || form.isSubmitting}
            className={[
              'w-full rounded-2xl py-3.5 text-sm font-bold',
              'flex items-center justify-center gap-2',
              'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
              'transition active:scale-[0.98]',
              (!form.isFormValid || form.isSubmitting) ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {form.isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              tForm.save
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Pill-shaped chip — for services and providers. */
function ChoiceChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/** Square-ish chip — for time slots (tabular numbers, slightly more padding). */
function TimeChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-3 py-2 text-sm font-bold tabular-nums transition active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
