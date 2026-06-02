'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, ChevronRight } from 'lucide-react';
import type { AppointmentStatus as ContractsStatus } from '@appointment/contracts';
import { useDashboardI18n } from '../../../_i18n/useDashboardI18n';
import { SERVICE_COLORS } from '../_lib/calendar.design';
import { formatDate, formatTime } from '../_lib/calendar.utils';
import type { Appointment, AppointmentStatus } from '../_lib/calendar.types';

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled:             'bg-blue-50 text-blue-700',
  confirmed:             'bg-indigo-50 text-indigo-700',
  completed:             'bg-green-50 text-green-700',
  cancelled_by_customer: 'bg-gray-100 text-gray-500',
  cancelled_by_business: 'bg-gray-100 text-gray-500',
  no_show:               'bg-orange-50 text-orange-700',
};

// Terminal statuses receive no action buttons.
const TERMINAL: ReadonlySet<AppointmentStatus> = new Set([
  'completed',
  'no_show',
  'cancelled_by_customer',
  'cancelled_by_business',
]);

// ─── Confirmation config ──────────────────────────────────────────────────────

type ActionVariant = 'success' | 'neutral' | 'danger';

interface ConfirmationConfig {
  status: ContractsStatus;
  title: string;
  variant: ActionVariant;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  appointment: Appointment | null;
  timezone: string;
  canMutate: boolean;
  onStatusUpdate: (appointmentId: string, newStatus: ContractsStatus) => Promise<void>;
  /** Called after the close animation completes — parent should clear selectedAppointment here. */
  onClosed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarAppointmentSheet({
  appointment,
  timezone,
  canMutate,
  onStatusUpdate,
  onClosed,
}: Props) {
  const dict = useDashboardI18n();
  const tList = dict.appointmentsList;
  const tForm = dict.appointmentForm;

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled:             tList.statusScheduled,
    confirmed:             tList.statusConfirmed,
    completed:             tList.statusCompleted,
    cancelled_by_customer: tList.statusCancelledByCustomer,
    cancelled_by_business: tList.statusCancelledByBusiness,
    no_show:               tList.statusNoShow,
  };

  // ── Animation state ──────────────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!appointment) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [appointment]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  // ── Mutation state ───────────────────────────────────────────────────────
  const [pendingStatus, setPendingStatus] = useState<ContractsStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationConfig | null>(null);

  useEffect(() => {
    setPendingStatus(null);
    setActionError(null);
    setConfirmation(null);
  }, [appointment?.id]);

  function requestConfirmation(config: ConfirmationConfig) {
    setActionError(null);
    setConfirmation(config);
  }

  async function handleConfirm() {
    if (!confirmation || pendingStatus || !appointment) return;
    const { status } = confirmation;
    // Keep confirmation panel visible while the request is in flight.
    // It only disappears on: success (sheet closes) or explicit "חזור" tap.
    setPendingStatus(status);
    setActionError(null);
    try {
      await onStatusUpdate(appointment.id, status);
      triggerClose();
    } catch {
      setActionError(tForm.saveError);
      setPendingStatus(null);
      // confirmation panel stays open — user can retry or tap "חזור"
    }
  }

  if (!appointment) return null;

  const c = SERVICE_COLORS[appointment.service.color];
  const showActions = canMutate && !TERMINAL.has(appointment.status);

  // Time-based availability (UTC comparison — timezone-safe)
  const now = new Date();
  const hasStarted = appointment.startTime <= now;

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

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header strip — service color accent */}
        <div className={`${c.bg} mx-4 mt-2 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-[15px] font-semibold leading-tight truncate ${c.customerText}`}>
              {appointment.service.name}
            </span>
            <span className={`text-[13px] font-normal leading-tight truncate ${c.serviceText}`}>
              {appointment.customer.name}
            </span>
          </div>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="mr-3 p-1.5 rounded-full text-gray-400 hover:bg-black/5 active:bg-black/10 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-4 flex flex-col gap-4">
          {/* Date */}
          <DetailRow label="תאריך">
            {formatDate(appointment.startTime, timezone)}
          </DetailRow>

          {/* Time */}
          <DetailRow label="שעה">
            <span className="tabular-nums" dir="ltr">
              {formatTime(appointment.startTime, timezone)} - {formatTime(appointment.endTime, timezone)}
            </span>
          </DetailRow>

          <DetailRow label="נותן שירות">
            {appointment.provider.name}
          </DetailRow>

          <DetailRow label="סטטוס">
            <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[appointment.status]}`}>
              {STATUS_LABELS[appointment.status]}
            </span>
          </DetailRow>

          {appointment.notes && (
            <DetailRow label="הערות">
              <span className="text-gray-600 dark:text-gray-300 leading-snug whitespace-pre-wrap">
                {appointment.notes}
              </span>
            </DetailRow>
          )}
        </div>

        {/* ── Action area ─────────────────────────────────────────────────── */}
        {showActions && (
          <div className="px-4 pt-5 pb-8">
            {confirmation ? (
              <ConfirmationPanel
                title={confirmation.title}
                confirmVariant={confirmation.variant}
                isPending={!!pendingStatus}
                error={actionError}
                onConfirm={handleConfirm}
                onBack={() => { setConfirmation(null); setActionError(null); }}
              />
            ) : (
              // Show only the actions that are eligible — no disabled phantom buttons.
              // hasStarted → can complete / mark no-show; !hasStarted → can cancel.
              <div className="flex flex-col gap-2">
                {hasStarted ? (
                  <>
                    <ActionButton
                      label={tForm.complete}
                      onClick={() => requestConfirmation({
                        status: 'COMPLETED',
                        title: 'לסמן את התור כהושלם?',
                        variant: 'success',
                      })}
                      isPending={pendingStatus === 'COMPLETED'}
                      disabled={!!pendingStatus}
                      variant="success"
                    />
                    <ActionButton
                      label={tList.statusNoShow}
                      onClick={() => requestConfirmation({
                        status: 'NO_SHOW',
                        title: 'לסמן שהלקוח לא הגיע?',
                        variant: 'neutral',
                      })}
                      isPending={pendingStatus === 'NO_SHOW'}
                      disabled={!!pendingStatus}
                      variant="neutral"
                    />
                  </>
                ) : (
                  <ActionButton
                    label={tForm.cancelAppointment}
                    onClick={() => requestConfirmation({
                      status: 'CANCELLED_BY_BUSINESS',
                      title: 'לבטל את התור?',
                      variant: 'danger',
                    })}
                    isPending={pendingStatus === 'CANCELLED_BY_BUSINESS'}
                    disabled={!!pendingStatus}
                    variant="danger"
                  />
                )}

                {actionError && (
                  <p className="text-[12px] text-red-500 text-center pt-1">{actionError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {!showActions && <div className="pb-8" />}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] text-gray-800 font-medium dark:text-gray-200 text-right min-w-0">{children}</span>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

type ActionVariantLocal = 'success' | 'neutral' | 'danger';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  isPending: boolean;
  disabled: boolean;
  variant: ActionVariantLocal;
}

const VARIANT_STYLES: Record<ActionVariantLocal, string> = {
  success: 'bg-green-50 text-green-700 border-green-100 active:bg-green-100',
  neutral: 'bg-gray-50 text-gray-600 border-gray-100 active:bg-gray-100',
  danger:  'bg-red-50 text-red-600 border-red-100 active:bg-red-100',
};

function ActionButton({ label, onClick, isPending, disabled, variant }: ActionButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center justify-center gap-2',
        'h-11 rounded-xl border text-[14px] font-medium transition-colors',
        VARIANT_STYLES[variant],
        disabled && !isPending ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  );
}

// ── Confirmation panel ────────────────────────────────────────────────────────

interface ConfirmationPanelProps {
  title: string;
  confirmVariant: ActionVariantLocal;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

const CONFIRM_VARIANT_STYLES: Record<ActionVariantLocal, string> = {
  success: 'bg-green-600 text-white active:bg-green-700',
  neutral: 'bg-gray-600 text-white active:bg-gray-700',
  danger:  'bg-red-600 text-white active:bg-red-700',
};

function ConfirmationPanel({
  title,
  confirmVariant,
  isPending,
  error,
  onConfirm,
  onBack,
}: ConfirmationPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 text-center">
        {title}
      </p>
      <p className="text-[12px] text-gray-400 text-center">
        לא ניתן לבטל פעולה זו כרגע
      </p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 h-11 rounded-xl border border-gray-100 bg-gray-50 text-gray-600 text-[14px] font-medium active:bg-gray-100 transition-colors disabled:opacity-40"
        >
          <ChevronRight size={15} />
          חזור
        </button>

        <button
          onClick={onConfirm}
          disabled={isPending}
          className={[
            'flex-1 flex items-center justify-center h-11 rounded-xl',
            'text-[14px] font-medium transition-colors',
            CONFIRM_VARIANT_STYLES[confirmVariant],
            isPending ? 'opacity-70' : '',
          ].join(' ')}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : 'אשר'}
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
