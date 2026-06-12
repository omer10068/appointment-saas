'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { formatDate, formatTime } from '../_lib/calendar.utils';
import type { Appointment } from '../_lib/calendar.types';
import { CalendarMonthPicker } from './calendar-month-picker';
import { useRescheduleAppointmentForm } from '../_lib/useRescheduleAppointmentForm';
import { BottomSheet } from './primitives/bottom-sheet';

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setShowCalendar(false);
    formRef.current.reset(appointment.startTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id]);

  async function handleSubmit(triggerClose: () => void) {
    if (!appointment) return;
    const startsAt = await form.submit(appointment.id);
    if (startsAt) {
      onSuccess(startsAt);
      triggerClose();
    }
  }

  const open = appointment !== null;

  return (
    <>
      <BottomSheet
        open={open}
        onClosed={onClosed}
        lockClose={form.isSubmitting}
        ariaLabel="שינוי מועד"
      >
        {(triggerClose) => {
          if (!appointment) return null;
          return (
            <>
              {/* Handle + header */}
              <div className="flex shrink-0 flex-col px-5 pt-3">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
                {/* Title first in DOM → visual right in RTL; close last → visual left */}
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-lg font-extrabold text-foreground">שינוי מועד</h2>
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
              <div className="flex-1 overflow-y-auto px-5 py-2">
                <div className="space-y-5 pb-2">

                  {/* Current appointment summary */}
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <p className="text-sm font-bold text-foreground">
                      {appointment.service.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {appointment.customer.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      <span className="tabular-nums" dir="ltr">
                        {formatTime(appointment.startTime, timezone)}
                      </span>
                      {' '}
                      {formatDate(appointment.startTime, timezone)}{' '}
                      (מועד נוכחי)
                    </p>
                  </div>

                  {/* Date */}
                  <FormField label="תאריך" required>
                    <button
                      type="button"
                      onClick={() => setShowCalendar((s) => !s)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3"
                    >
                      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(form.selectedDate, timezone)}
                      </span>
                    </button>
                  </FormField>

                  {/* Time slots */}
                  <FormField label="שעה" required>
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
                      <div className="grid grid-cols-4 gap-2">
                        {form.slots.map((slot) => (
                          <button
                            key={slot.startsAt}
                            type="button"
                            onClick={() =>
                              form.selectedSlot?.startsAt === slot.startsAt
                                ? form.selectSlot(null)
                                : form.selectSlot(slot)
                            }
                            className={[
                              'rounded-2xl border py-2.5 text-center text-sm font-bold tabular-nums transition active:scale-95',
                              form.selectedSlot?.startsAt === slot.startsAt
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-foreground',
                            ].join(' ')}
                          >
                            {slot.localStartTime}
                          </button>
                        ))}
                      </div>
                    )}
                  </FormField>

                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
                {form.submitError && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                    <p className="flex-1 text-right text-[13px] leading-snug text-red-600">
                      {form.submitError}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleSubmit(triggerClose)}
                  disabled={!form.isFormValid || form.isSubmitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
                >
                  {form.isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'עדכון מועד'
                  )}
                </button>
              </div>
            </>
          );
        }}
      </BottomSheet>

      {/* Month picker — rendered outside BottomSheet so its fixed positioning is not
          affected by the sheet panel's transition-transform. open guards against
          leaving it mounted when the parent sheet closes. */}
      <CalendarMonthPicker
        open={open && showCalendar}
        selectedDate={form.selectedDate}
        timezone={timezone}
        onSelectDate={(date) => {
          form.selectDate(date);
          setShowCalendar(false);
        }}
        onClosed={() => setShowCalendar(false)}
      />
    </>
  );
}
