'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { useDashboardI18n } from '../../../_i18n/useDashboardI18n';
import { formatIsraeliPhone, getDateStripDays, toLocalDateString } from '../_lib/calendar.utils';
import type { DateChip } from '../_lib/calendar.utils';
import { useCreateAppointmentForm } from '../_lib/useCreateAppointmentForm';
import type { Service, ServiceProvider } from '../_lib/calendar.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClosed: () => void;
  /** Called immediately on successful appointment creation (before close animation). */
  onCreated?: () => void;
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

  // ── Animation (same pattern as CalendarAppointmentSheet) ────────────────────
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

  // On every open: reset all selections and clamp date to business-today if needed.
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    formRef.current.resetForm(initialDateRef.current);
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
      onCreated?.();
      triggerClose();
    }
  }

  // ── Date strip ────────────────────────────────────────────────────────────────
  // Recomputed when timezone changes. getDateStripDays always starts from today.
  const dateStrip = useMemo(() => getDateStripDays(timezone), [timezone]);
  const selectedLocalDate = toLocalDateString(form.selectedDate, timezone);

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
                  <p className="text-[13px] text-gray-400">{tForm.noStaff}</p>
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

            {/* ── Date strip ──────────────────────────────────────────────── */}
            <FormSection label="תאריך">
              <DateStrip
                days={dateStrip}
                selectedLocalDate={selectedLocalDate}
                onSelect={form.selectDate}
              />
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
                  <p className="text-[13px] text-gray-400">אין זמנים פנויים ביום זה</p>
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
                <p className="text-[13px] text-gray-400">{tForm.noCustomers}</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {form.customers.map((c) => {
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
                        {/* Avatar / check — right side (RTL start, first flex child) */}
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

                        {/* Name + phone — expands left, text right-aligned (items-start = right in RTL flex-col) */}
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
            </FormSection>

          </div>
        </div>

        {/* Footer — flex-none, always visible */}
        <div className="flex-none px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          {form.submitError && (
            <p className="mb-3 text-[13px] text-red-500 text-center">
              {form.submitError}
            </p>
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

function DateStrip({
  days,
  selectedLocalDate,
  onSelect,
}: {
  days: DateChip[];
  selectedLocalDate: string;
  onSelect: (date: Date) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {days.map((chip) => {
        const active = chip.localDateStr === selectedLocalDate;
        return (
          <button
            key={chip.localDateStr}
            type="button"
            onClick={() => onSelect(chip.date)}
            className={[
              'flex flex-col items-center justify-center gap-0.5',
              'min-w-13.5 py-2.5 rounded-xl shrink-0',
              'transition-all duration-150',
              active
                ? 'bg-[#2d2d3a] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
            ].join(' ')}
          >
            <span
              className={[
                'text-[11px] font-medium leading-none',
                active ? 'text-white/60' : 'text-gray-400 dark:text-gray-500',
              ].join(' ')}
            >
              {chip.weekdayLabel}
            </span>
            <span className="text-[13px] font-semibold leading-none mt-0.5">
              {chip.dayMonth}
            </span>
          </button>
        );
      })}
    </div>
  );
}
