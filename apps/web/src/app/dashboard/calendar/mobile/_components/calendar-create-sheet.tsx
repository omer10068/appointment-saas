'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, Check, Search, AlertCircle, CalendarDays } from 'lucide-react';
import { useDashboardI18n } from '../../../_i18n/useDashboardI18n';
import { formatDate, formatIsraeliPhone } from '../_lib/calendar.utils';
import { CalendarMonthPicker } from './calendar-month-picker';
import { useCreateAppointmentForm } from '../_lib/useCreateAppointmentForm';
import type { Service, ServiceProvider } from '../_lib/calendar.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClosed: () => void;
  onCreated?: (appointmentDate: Date) => void;
  businessId: string | null;
  timezone: string;
  initialDate: Date;
  services: Service[];
  serviceProviders: ServiceProvider[];
  currentBusinessUserId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Single initial — first letter of first name only. */
function getInitial(name: string): string {
  return (name.trim().split(/\s+/)[0]?.[0] ?? '').toUpperCase();
}

// ─── UI Primitives — exact match of reference ui-kit.tsx ─────────────────────

/**
 * Matches reference `Field`:
 * mb-1.5 label, gap-1 for asterisk placement, text-foreground label color.
 */
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

/** Matches reference `ChoiceChip`: rounded-full pill. */
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

/** Matches reference time-slot button from RescheduleSheet: rounded-2xl, py-2.5. */
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
        'w-full rounded-2xl border py-2.5 text-center text-sm font-bold tabular-nums transition active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
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

  // ── Form ─────────────────────────────────────────────────────────────────────
  const form = useCreateAppointmentForm({
    businessId,
    timezone,
    initialDate,
    serviceProviders,
    currentBusinessUserId,
  });

  // Stable refs to avoid stale closures in the open effect.
  const formRef = useRef(form);
  formRef.current = form;
  const initialDateRef = useRef(initialDate);
  initialDateRef.current = initialDate;
  const servicesRef = useRef(services);
  servicesRef.current = services;

  // ── Customer search ───────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const MAX_VISIBLE = 5;

  const allMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return form.customers;
    const looksLikePhone = /^[\d+\-\s]+$/.test(q);
    const qDigits = looksLikePhone ? q.replace(/\D/g, '') : '';
    let qPhone = qDigits;
    if (qPhone.startsWith('972')) qPhone = qPhone.slice(3);
    else if (qPhone.startsWith('0')) qPhone = qPhone.slice(1);
    return form.customers.filter((c) => {
      if (c.fullName.toLowerCase().includes(q)) return true;
      if (qPhone && c.phone) {
        const phoneDigits = c.phone.replace(/\D/g, '');
        const localPhone = phoneDigits.startsWith('972')
          ? phoneDigits.slice(3)
          : phoneDigits;
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

  // ── Open / close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    formRef.current.resetForm(initialDateRef.current);
    // Auto-select only when there is exactly one service — no ambiguity.
    if (servicesRef.current.length === 1) {
      formRef.current.selectService(servicesRef.current[0].id);
    }
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

  // ── Submit ────────────────────────────────────────────────────────────────────
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
      {/* Backdrop — reference: bg-foreground/40 backdrop-blur-[1px] */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet — reference: max-h-[88%] bg-card rounded-t-[2rem] border-t border-border shadow-2xl shadow-foreground/30 */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0 flex flex-col',
          'max-h-[88%]',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + Header — single shrink-0 container (px-5 pt-3), no border-b */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          {/* Title right (first child in RTL), close left (last child in RTL) */}
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-extrabold text-foreground">
              {tForm.addAppointment}
            </h2>
            {/* Reference: no hover, just active:scale-90 */}
            <button
              onClick={triggerClose}
              aria-label="סגור"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable body — reference: px-5 py-2 on container, space-y-5 pb-2 on inner */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <div className="space-y-5 pb-2">

            {/* ── Service ─────────────────────────────────────────────────── */}
            <FormField label={tForm.service} required>
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
            </FormField>

            {/* ── Provider (shown once a service is selected) ─────────────── */}
            {form.selectedServiceId && (
              <FormField label={tForm.staff} required>
                {form.bookableProviders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    אין נותני שירות זמינים לשירות זה
                  </p>
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
              </FormField>
            )}

            {/* ── Date ────────────────────────────────────────────────────── */}
            <FormField label="תאריך" required>
              {/* Reference date field: flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3 */}
              <button
                type="button"
                onClick={() => setShowCalendar((s) => !s)}
                className="flex items-center gap-2 w-full rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <CalendarDays
                  className="size-4 text-primary shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-foreground">
                  {formatDate(form.selectedDate, timezone)}
                </span>
              </button>
            </FormField>

            {/* ── Slots (shown once service + provider are selected) ───────── */}
            {form.selectedServiceId && form.selectedProviderId && (
              <FormField label="שעה" required>
                {form.isPastDate ? (
                  <p className="text-sm text-amber-500">
                    לא ניתן לקבוע תור לתאריך שעבר
                  </p>
                ) : form.isLoadingSlots ? (
                  <div className="flex justify-center py-3">
                    <Loader2
                      size={20}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                ) : form.slotsError ? (
                  <p className="text-sm text-red-500">{form.slotsError}</p>
                ) : form.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    אין שעות פנויות ביום זה
                  </p>
                ) : (
                  /* Reference RescheduleSheet: grid grid-cols-4 gap-2, py-2.5 per chip */
                  <div className="grid grid-cols-4 gap-2">
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
              </FormField>
            )}

            {/* ── Customer ─────────────────────────────────────────────────── */}
            <FormField label={tForm.customer} required>
              {form.isLoadingCustomers ? (
                <div className="flex justify-center py-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-muted-foreground"
                  />
                </div>
              ) : form.customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין לקוחות פעילים</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* SearchBar — exact reference ui-kit SearchBar:
                      outer div holds border+bg; input is bg-transparent focus:outline-none only */}
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
                    <Search
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="חיפוש לפי שם או טלפון"
                      className="w-full bg-transparent text-base text-foreground placeholder:text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>

                  {/* Customer list — reference: max-h-44 overflow-y-auto space-y-1 */}
                  {visibleCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      לא נמצאו לקוחות מתאימים
                    </p>
                  ) : (
                    <ul className="max-h-44 space-y-1 overflow-y-auto">
                      {visibleCustomers.map((c) => {
                        const selected =
                          form.selectedCustomerId === c.businessCustomerId;
                        return (
                          <li key={c.businessCustomerId}>
                            <button
                              onClick={() =>
                                selected
                                  ? form.selectCustomer(null)
                                  : form.selectCustomer(c.businessCustomerId)
                              }
                              className={[
                                'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-right transition',
                                selected
                                  ? 'border-primary bg-accent'
                                  : 'border-transparent bg-card',
                              ].join(' ')}
                            >
                              {/* Avatar — reference Avatar: always bg-accent text-accent-foreground, single initial */}
                              <div className="size-9 shrink-0 flex items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                                {getInitial(c.fullName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                  {c.fullName}
                                </p>
                                {c.phone && (
                                  <p
                                    className="text-xs text-muted-foreground"
                                    dir="ltr"
                                  >
                                    {formatIsraeliPhone(c.phone)}
                                  </p>
                                )}
                              </div>
                              {/* Check — reference: separate last-child icon when selected */}
                              {selected && (
                                <Check
                                  className="size-4 shrink-0 text-primary"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {hasMore && (
                    <p className="text-xs text-muted-foreground text-center pt-0.5">
                      יש עוד תוצאות — חפש לפי שם או טלפון לצמצום
                    </p>
                  )}
                </div>
              )}
            </FormField>

          </div>
        </div>

        {/* Footer — reference: shrink-0 border-t border-border bg-card px-5 pb-7 pt-4 */}
        <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
          {form.submitError && (
            <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3.5 py-2.5">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-600 dark:text-red-400 leading-snug text-right flex-1">
                {form.submitError}
              </p>
            </div>
          )}
          {/* PrimaryButton — reference: rounded-2xl py-3.5 gap-1.5 shadow-sm shadow-primary/30 active:scale-[0.98] disabled:opacity-60 */}
          <button
            onClick={handleSubmit}
            disabled={!form.isFormValid || form.isSubmitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {form.isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              tForm.save
            )}
          </button>
        </div>
      </div>

      {/* Month picker — rendered outside the transformed sheet div so fixed positioning works correctly */}
      <CalendarMonthPicker
        open={showCalendar}
        selectedDate={form.selectedDate}
        timezone={timezone}
        onSelectDate={(date) => {
          form.selectDate(date);
        }}
        onClosed={() => setShowCalendar(false)}
      />
    </div>
  );
}
