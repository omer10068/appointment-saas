'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { DashboardServiceDto, DashboardServiceProviderDto } from '@appointment/contracts';
import {
  ApiError,
  updateDashboardServiceProvider,
} from '@/lib/api';
import { BottomSheet } from './primitives/bottom-sheet';

// ─── Form primitives ──────────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-border bg-muted px-4 py-3 text-[16px] ' +
  'text-foreground placeholder:text-sm placeholder:text-muted-foreground outline-none';

// ─── Status segment config ────────────────────────────────────────────────────

const STATUS_ACTIVE_SELECTED   = 'bg-emerald-50 text-emerald-700 border-emerald-200';
const STATUS_INACTIVE_SELECTED = 'bg-muted text-muted-foreground border-border';
const STATUS_UNSELECTED        = 'bg-card text-muted-foreground border-border';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  provider: DashboardServiceProviderDto | null;
  services: DashboardServiceDto[];
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProviderEditSheet({
  provider,
  services,
  businessId,
  getToken,
  onClosed,
  onSaved,
}: Props) {
  const [displayName, setDisplayName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isActive, setIsActive]       = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (!provider) return;
    setDisplayName(provider.displayName);
    setSelectedIds(new Set(provider.serviceIds));
    setIsActive(provider.isActive);
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id]);

  function toggleService(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const activeServices   = services.filter((s) => s.isActive);
  const inactiveAssigned = services.filter(
    (s) => !s.isActive && provider?.serviceIds.includes(s.id),
  );

  const isValid = displayName.trim().length > 0 && selectedIds.size > 0;

  async function handleSave(triggerClose: () => void) {
    if (!businessId || !provider || !isValid || submitting) return;

    const sortedInitial   = [...provider.serviceIds].sort().join(',');
    const sortedCurrent   = [...selectedIds].sort().join(',');
    const serviceIdsChanged  = sortedInitial !== sortedCurrent;
    const displayNameChanged = displayName.trim() !== provider.displayName;
    const fieldsChanged      = displayNameChanged || serviceIdsChanged;
    const statusChanged      = isActive !== provider.isActive;

    if (!fieldsChanged && !statusChanged) {
      triggerClose();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateDashboardServiceProvider(
        businessId,
        provider.id,
        { displayName: displayName.trim(), serviceIds: [...selectedIds], isActive },
        getToken,
      );
      onSaved();
      triggerClose();
    } catch (err) {
      setError(
        err instanceof ApiError &&
          err.status === 400 &&
          err.message.includes('BusinessUser')
          ? 'לא ניתן להפעיל — המשתמש המקושר אינו פעיל'
          : 'שגיאה בשמירה, נסה שוב',
      );
      setSubmitting(false);
    }
  }

  const open = provider !== null;

  return (
    <BottomSheet
      open={open}
      onClosed={onClosed}
      lockClose={submitting}
      ariaLabel="עריכת חבר צוות"
    >
      {(triggerClose) => {
        if (!provider) return null;
        return (
          <>
            {/* Handle + header */}
            <div className="flex shrink-0 flex-col px-5 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">עריכת חבר צוות</h2>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{provider.displayName}</p>
                </div>
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

                {/* Centered avatar */}
                <div className="flex flex-col items-center py-2">
                  <div className="flex size-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
                    {provider.displayName.charAt(0).toUpperCase()}
                  </div>
                </div>

                <FormField label="שם תצוגה">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="off"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField label="שירותים" hint="בחרו אילו שירותים ספק השירות מבצע">
                  {activeServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">אין שירותים פעילים בעסק</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeServices.map((s) => {
                        const selected = selectedIds.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className={[
                              'rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97]',
                              selected
                                ? 'border-transparent bg-accent text-accent-foreground'
                                : 'border-border bg-muted text-muted-foreground',
                            ].join(' ')}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FormField>

                {inactiveAssigned.length > 0 && (
                  <FormField label="שירותים לא פעילים (מוקצים כרגע)">
                    <div className="flex flex-wrap gap-2">
                      {inactiveAssigned.map((s) => {
                        const selected = selectedIds.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className={[
                              'rounded-full border px-3 py-1.5 text-xs font-semibold opacity-60 transition active:scale-[0.97]',
                              selected
                                ? 'border-transparent bg-accent text-accent-foreground'
                                : 'border-border bg-muted text-muted-foreground',
                            ].join(' ')}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                )}

                {selectedIds.size === 0 && (
                  <p className="text-xs text-amber-600">יש לבחור לפחות שירות אחד</p>
                )}

                <FormField label="סטטוס">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsActive(true)}
                      className={[
                        'flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                        isActive ? STATUS_ACTIVE_SELECTED : STATUS_UNSELECTED,
                      ].join(' ')}
                    >
                      פעיל
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsActive(false)}
                      className={[
                        'flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-[0.98]',
                        !isActive ? STATUS_INACTIVE_SELECTED : STATUS_UNSELECTED,
                      ].join(' ')}
                    >
                      לא פעיל
                    </button>
                  </div>
                </FormField>

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
                onClick={() => handleSave(triggerClose)}
                disabled={!isValid || submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמור שינויים'}
              </button>
            </div>
          </>
        );
      }}
    </BottomSheet>
  );
}
