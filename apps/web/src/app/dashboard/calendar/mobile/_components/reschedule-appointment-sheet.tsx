'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { SERVICE_COLORS } from '../_lib/calendar.design';
import { formatDate, formatTime } from '../_lib/calendar.utils';
import type { Appointment } from '../_lib/calendar.types';
import { CalendarDatePicker } from './calendar-date-picker';
import { useRescheduleAppointmentForm } from '../_lib/useRescheduleAppointmentForm';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  appointment: Appointment | null;
  businessId: string | null;
  getToken: () => Promise<string | null>;
  timezone: string;
  /** Called immediately on successful reschedule, before the close animation. Receives the new startsAt ISO string. */
  onSuccess: (newStartsAt: string) => void;
  onClosed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RescheduleAppointmentSheet({
  appointment,
  businessId,
  getToken,
  timezone,
  onSuccess,
  onClosed,
}: Props) {
  const form = useRescheduleAppointmentForm({
    businessId,
    serviceId:         appointment?.service.id ?? '',
    serviceProviderId: appointment?.provider.id ?? '',
    timezone,
    getToken,
  });
  const formRef = useRef(form);
  formRef.current = form;

  const [visible, setVisible]               = useState(false);
  const isClosingRef                        = useRef(false);
  const [showCalendar, setShowCalendar]     = useState(false);

  useEffect(() => {
    if (!appointment) return;
    isClosingRef.current = false;
    setShowCalendar(false);
    formRef.current.reset(appointment.startTime);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  async function handleSubmit() {
    if (!appointment) return;
    const startsAt = await form.submit(appointment.id);
    if (startsAt) {
      onSuccess(startsAt);
      triggerClose();
    }
  }

  if (!appointment) return null;

  const c = SERVICE_COLORS[appointment.service.color];

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={form.isSubmitting ? undefined : triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'flex flex-col',
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
            <span className="text-lg font-extrabold text-foreground">שינוי מועד</span>
            <button
              onClick={form.isSubmitting ? undefined : triggerClose}
              aria-label="סגור"
              disabled={form.isSubmitting}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-90 disabled:opacity-40"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 flex flex-col gap-6 pb-8">

            {/* Current appointment context — read-only */}
            <div className={`${c.bg} rounded-2xl px-4 py-3 flex flex-col gap-0.5`}>
              <span className={`text-[15px] font-semibold leading-tight ${c.customerText}`}>
                {appointment.service.name}
              </span>
              <span className={`text-[13px] leading-tight ${c.serviceText}`}>
                {appointment.customer.name}
              </span>
              <span className={`text-[12px] mt-1 ${c.metaText}`}>
                {appointment.provider.name}
              </span>
              <span className={`text-[12px] ${c.metaText}`} dir="ltr">
                {formatDate(appointment.startTime, timezone)},{' '}
                {formatTime(appointment.startTime, timezone)}
              </span>
            </div>

            {/* Date picker */}
            <FormSection label="תאריך חדש">
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

            {/* Slot picker */}
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

          </div>
        </div>

        {/* Footer */}
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
              'שמירת מועד חדש'
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
