'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, Check, Search, AlertCircle } from 'lucide-react';
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

    const qDigits = q.replace(/\D/g, '');
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
  // Also bump openKey so CalendarDatePicker mounts fresh with the reset date.
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
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
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
          'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle — flex-none */}
        <div className="flex-none flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header — flex-none, always visible */}
        <div className="flex-none flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[17px] font-semibold text-gray-800 dark:text-gray-100">
            {tForm.addAppointment}
          </span>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form body — flex-1, scrolls independently */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 flex flex-col gap-6 pb-8">

            {/* ── Service ─────────────────────────────────────────────────── */}
            <FormSection label={tForm.service}>
              {services.length === 0 ? (
                <p className="text-[13px] text-gray-400">{tForm.noServices}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <SelectionPill
                      key={s.id}
                      label={s.name}
                      active={form.selectedServiceId === s.id}
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
                  <p className="text-[13px] text-gray-400">אין נותני שירות זמינים לשירות זה</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.bookableProviders.map((sp) => (
                      <SelectionPill
                        key={sp.id}
                        label={sp.name}
                        active={form.selectedProviderId === sp.id}
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
              {/* Toggle button: emoji + formatted selected date */}
              <button
                type="button"
                onClick={() => setShowCalendar((s) => !s)}
                className="flex items-center gap-2.5 w-full text-right active:opacity-60 transition-opacity"
              >
                <span className="text-[20px] leading-none select-none">📅</span>
                <span className="text-[14px] font-medium text-gray-700 dark:text-gray-200">
                  {formatDate(form.selectedDate, timezone)}
                </span>
              </button>

              {/* Calendar panel — conditionally rendered; remounts fresh each open */}
              {showCalendar && (
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 mt-1">
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
                  <p className="text-[13px] text-amber-500">לא ניתן לקבוע תור לתאריך שעבר</p>
                ) : form.isLoadingSlots ? (
                  <div className="flex justify-center py-3">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : form.slotsError ? (
                  <p className="text-[13px] text-red-500">{form.slotsError}</p>
                ) : form.slots.length === 0 ? (
                  <p className="text-[13px] text-gray-400">אין שעות פנויות ביום זה</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.slots.map((slot) => (
                      <SelectionPill
                        key={slot.startsAt}
                        label={slot.localStartTime}
                        active={form.selectedSlot?.startsAt === slot.startsAt}
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
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : form.customers.length === 0 ? (
                <p className="text-[13px] text-gray-400">אין לקוחות פעילים</p>
              ) : (
                <div className="flex flex-col gap-2">

                  {/* Search input */}
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="חיפוש לפי שם או טלפון"
                      className={[
                        'w-full pl-3 pr-9 py-2.5 rounded-xl text-[14px]',
                        'bg-gray-50 dark:bg-gray-800',
                        'border border-gray-200 dark:border-gray-700',
                        'text-gray-700 dark:text-gray-200',
                        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                        'outline-none focus:border-[#2d2d3a] dark:focus:border-indigo-500',
                        'transition-colors',
                      ].join(' ')}
                    />
                  </div>

                  {/* Results */}
                  {visibleCustomers.length === 0 ? (
                    <p className="text-[13px] text-gray-400 text-center py-2">
                      לא נמצאו לקוחות מתאימים
                    </p>
                  ) : (
                    <div className="flex flex-col gap-0.5">
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
                              'flex items-center gap-3 py-3 px-2 rounded-xl w-full transition-colors',
                              selected
                                ? 'bg-[#f0f0f8] dark:bg-indigo-950/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                            ].join(' ')}
                          >
                            {/* Avatar / check — right side (RTL start) */}
                            <div
                              className={[
                                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                                'text-[12px] font-semibold transition-colors',
                                selected
                                  ? 'bg-[#2d2d3a] text-white dark:bg-indigo-600'
                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
                              ].join(' ')}
                            >
                              {selected ? (
                                <Check size={16} strokeWidth={2.5} />
                              ) : (
                                getInitials(c.fullName)
                              )}
                            </div>

                            {/* Name + phone — items-start = right in RTL flex-col */}
                            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                              <span
                                className={[
                                  'text-[14px] font-medium leading-tight truncate max-w-full',
                                  selected
                                    ? 'text-[#2d2d3a] dark:text-indigo-200'
                                    : 'text-gray-700 dark:text-gray-300',
                                ].join(' ')}
                              >
                                {c.fullName}
                              </span>
                              {c.phone && (
                                <span
                                  className="text-[12px] text-gray-400 leading-none"
                                  dir="ltr"
                                >
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
                    <p className="text-[12px] text-gray-400 text-center pt-0.5">
                      יש עוד תוצאות — חפש לפי שם או טלפון לצמצום
                    </p>
                  )}

                </div>
              )}
            </FormSection>

          </div>
        </div>

        {/* Footer — flex-none, always visible */}
        <div className="flex-none px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          {form.submitError && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3.5 py-2.5">
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
              'w-full h-12 rounded-2xl text-white text-[15px] font-semibold transition-all',
              'flex items-center justify-center gap-2',
              form.isFormValid && !form.isSubmitting
                ? 'bg-[#2d2d3a] hover:bg-[#3d3d4a] active:bg-[#1d1d2a]'
                : 'bg-[#2d2d3a] opacity-40 cursor-not-allowed',
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
      <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

function SelectionPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150',
        active
          ? 'bg-[#2d2d3a] text-white border-[#2d2d3a] shadow-sm'
          : 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
