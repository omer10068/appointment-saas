'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { DashboardBusinessUserDto, DashboardServiceDto } from '@appointment/contracts';
import { ApiError, createDashboardServiceProvider } from '../../../../../lib/api';

// ─── Form primitives ──────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {hint && <p className="mb-2 text-[11px] font-medium text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-border bg-muted px-4 py-3 text-[16px] ' +
  'text-foreground placeholder:text-muted-foreground outline-none';

function roleLabel(role: string): string {
  if (role === 'OWNER') return 'בעלים';
  if (role === 'MANAGER') return 'מנהל';
  return 'חבר צוות';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  eligibleUsers: DashboardBusinessUserDto[];
  services: DashboardServiceDto[];
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  onCreated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProviderCreateSheet({
  open,
  eligibleUsers,
  services,
  businessId,
  getToken,
  onClosed,
  onCreated,
}: Props) {
  const [visible, setVisible]               = useState(false);
  const isClosingRef                        = useRef(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [displayName, setDisplayName]       = useState('');
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [error, setError]                   = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId(null);
    setDisplayName('');
    setSelectedIds(new Set());
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

  const activeServices = services.filter((s) => s.isActive);
  const isValid        = !!selectedUserId && displayName.trim().length > 0 && selectedIds.size > 0;

  async function handleSubmit() {
    if (!businessId || !selectedUserId || !isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await createDashboardServiceProvider(
        businessId,
        {
          displayName: displayName.trim(),
          businessUserId: selectedUserId,
          serviceIds: [...selectedIds],
        },
        getToken,
      );
      onCreated();
      triggerClose();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'למשתמש הזה כבר קיים פרופיל נותן שירות'
          : 'שגיאה בשמירה, נסה שוב',
      );
      setSubmitting(false);
    }
  }

  if (!open && !visible) return null;

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
            <h2 className="text-lg font-extrabold text-foreground">איש צוות חדש</h2>
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

            {/* User picker */}
            <FormField label="קישור למשתמש" required>
              {eligibleUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  כל המשתמשים כבר מקושרים כנותני שירות
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {eligibleUsers.map((user) => {
                    const selected = selectedUserId === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={[
                          'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-right transition active:scale-[0.99]',
                          selected
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'border-border bg-card text-foreground',
                        ].join(' ')}
                      >
                        <span className="text-sm font-semibold">{roleLabel(user.role)}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          …{user.id.slice(-6)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </FormField>

            {/* Display name */}
            <FormField label="שם תצוגה" required>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="לדוגמה: רחלי כהן"
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </FormField>

            {/* Services */}
            <FormField
              label="שירותים"
              required
              hint="בחרו אילו שירותים איש הצוות מבצע"
            >
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
                          'rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground',
                        ].join(' ')}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </FormField>

            {selectedIds.size === 0 && activeServices.length > 0 && (
              <p className="text-xs text-amber-600">יש לבחור לפחות שירות אחד</p>
            )}

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
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמירה'}
          </button>
        </div>
      </div>
    </div>
  );
}
