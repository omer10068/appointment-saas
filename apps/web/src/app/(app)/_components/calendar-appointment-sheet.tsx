'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  X,
  Loader2,
  ChevronRight,
  Clock3,
  CalendarDays,
  UserRound,
  Scissors,
  AlignLeft,
} from 'lucide-react';
import type { AppointmentStatus as ContractsStatus } from '@appointment/contracts';
import { useDashboardI18n } from '@/app/dashboard/_i18n/useDashboardI18n';
import { formatDate, formatTime } from '../_lib/calendar.utils';
import type { Appointment, AppointmentStatus } from '../_lib/calendar.types';

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_BADGE_STYLE: Record<
  AppointmentStatus,
  { bg: string; text: string; dot: string }
> = {
  scheduled: { bg: 'bg-accent', text: 'text-accent-foreground', dot: 'bg-primary' },
  confirmed: { bg: 'bg-accent', text: 'text-accent-foreground', dot: 'bg-primary' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled_by_customer: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' },
  cancelled_by_business: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/60' },
  no_show: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

// Terminal statuses receive no action buttons.
const TERMINAL: ReadonlySet<AppointmentStatus> = new Set([
  'completed',
  'no_show',
  'cancelled_by_customer',
  'cancelled_by_business',
]);

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Called when the user taps the reschedule button; parent should open the reschedule sheet. */
  onReschedule?: () => void;
  /** Called after the close animation completes — parent should clear selectedAppointment here. */
  onClosed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarAppointmentSheet({
  appointment,
  timezone,
  canMutate,
  onStatusUpdate,
  onReschedule,
  onClosed,
}: Props) {
  const dict = useDashboardI18n();
  const tList = dict.appointmentsList;
  const tForm = dict.appointmentForm;

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: tList.statusScheduled,
    confirmed: tList.statusConfirmed,
    completed: tList.statusCompleted,
    cancelled_by_customer: tList.statusCancelledByCustomer,
    cancelled_by_business: tList.statusCancelledByBusiness,
    no_show: tList.statusNoShow,
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
    // It disappears on: success (sheet closes) or explicit "חזור" tap.
    setPendingStatus(status);
    setActionError(null);
    try {
      await onStatusUpdate(appointment.id, status);
      triggerClose();
    } catch {
      setActionError(tForm.saveError);
      setPendingStatus(null);
    }
  }

  if (!appointment) return null;

  const showActions = canMutate && !TERMINAL.has(appointment.status);

  // Time-based availability (UTC comparison — timezone-safe)
  const now = new Date();
  const hasStarted = appointment.startTime <= now;

  const badge = STATUS_BADGE_STYLE[appointment.status];

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
          {/* Title first in DOM → visual right in RTL; close last → visual left */}
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-extrabold text-foreground">פרטי תור</h2>
            <button
              onClick={triggerClose}
              aria-label="סגור"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <div className="space-y-4 pb-2">

            {/* Service name + customer name + status badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-tight text-foreground">
                  {appointment.service.name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {appointment.customer.name}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}
              >
                <span className={`size-1.5 rounded-full ${badge.dot}`} />
                {STATUS_LABELS[appointment.status]}
              </span>
            </div>

            {/* Details panel */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-muted/50 p-4">
              <DetailRow icon={<Clock3 className="size-4" />} label="שעה">
                <span className="tabular-nums text-[12px] font-semibold" dir="ltr">
                  {formatTime(appointment.startTime, timezone)} - {formatTime(appointment.endTime, timezone)}
                </span>
              </DetailRow>

              <DetailRow icon={<CalendarDays className="size-4" />} label="תאריך">
                <span className="text-[12px] font-semibold">
                  {formatDate(appointment.startTime, timezone)}
                </span>
              </DetailRow>

              <DetailRow icon={<UserRound className="size-4" />} label="נותן שירות">
                <span className="text-[12px] font-semibold">
                  {appointment.provider.name}
                </span>
              </DetailRow>

              <DetailRow icon={<Scissors className="size-4" />} label="שירות">
                <span className="text-[12px] font-semibold">
                  {appointment.service.name}
                </span>
              </DetailRow>

              {appointment.notes && (
                <DetailRow icon={<AlignLeft className="size-4" />} label="הערות">
                  <span className="whitespace-pre-wrap text-right leading-snug text-[12px] font-semibold">
                    {appointment.notes}
                  </span>
                </DetailRow>
              )}
            </div>
          </div>
        </div>

        {/* Footer — actions or safe-area pad */}
        {showActions ? (
          <div className="shrink-0 border-t border-border bg-card px-5 pb-7 pt-4">
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
              <>
                {hasStarted ? (
                  <div className="grid grid-cols-2 gap-2.5">
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
                  </div>
                ) : (
                  <div
                    className={[
                      'grid gap-2.5',
                      onReschedule ? 'grid-cols-2' : 'grid-cols-1',
                    ].join(' ')}
                  >
                    {onReschedule && (
                      <ActionButton
                        label="שינוי מועד"
                        onClick={onReschedule}
                        isPending={false}
                        disabled={!!pendingStatus}
                        variant="neutral"
                      />
                    )}
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
                  </div>
                )}

                {actionError && (
                  <p className="mt-2 text-center text-[12px] text-red-500">{actionError}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="pb-8" />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 text-right text-[13px] font-medium text-foreground">
        {children}
      </span>
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
  success: 'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
  neutral: 'border border-border bg-card text-foreground',
  danger: 'border border-red-200 bg-red-50 text-red-600',
};

function ActionButton({ label, onClick, isPending, disabled, variant }: ActionButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center justify-center',
        'rounded-2xl py-3.5 text-sm font-bold transition active:scale-[0.98]',
        VARIANT_STYLES[variant],
        disabled && !isPending ? 'cursor-not-allowed opacity-40' : '',
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
  success: 'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
  neutral: 'bg-foreground/80 text-card',
  danger: 'bg-red-600 text-white',
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
      <p className="text-center text-[15px] font-semibold text-foreground">{title}</p>
      <p className="text-center text-[12px] text-muted-foreground">
        לא ניתן לבטל פעולה זו כרגע
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onBack}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          <ChevronRight size={15} />
          חזור
        </button>

        <button
          onClick={onConfirm}
          disabled={isPending}
          className={[
            'flex w-full items-center justify-center',
            'rounded-2xl py-3.5 text-sm font-bold transition active:scale-[0.98] disabled:opacity-70',
            CONFIRM_VARIANT_STYLES[confirmVariant],
          ].join(' ')}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : 'אשר'}
        </button>
      </div>

      {error && (
        <p className="text-center text-[12px] text-red-500">{error}</p>
      )}
    </div>
  );
}
