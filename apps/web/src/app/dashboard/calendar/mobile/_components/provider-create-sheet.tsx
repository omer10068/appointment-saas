'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { DashboardBusinessUserDto, DashboardServiceDto } from '@appointment/contracts';
import { ApiError, createDashboardServiceProvider } from '../../../../../lib/api';

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full h-10 px-3 rounded-xl text-[16px] bg-gray-100 dark:bg-gray-800 outline-none ' +
  'text-gray-800 dark:text-gray-200 placeholder:text-gray-400';

function roleLabel(role: string): string {
  if (role === 'OWNER') return 'בעלים';
  if (role === 'MANAGER') return 'מנהל';
  return 'חבר צוות';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  eligibleUsers: DashboardBusinessUserDto[];
  /** All services (active only used for new provider). */
  services: DashboardServiceDto[];
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  /** Called immediately on successful creation, before the close animation. */
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
  const [visible, setVisible]           = useState(false);
  const isClosingRef                    = useRef(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [displayName, setDisplayName]   = useState('');
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [error, setError]               = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  // Reset + animate in when sheet opens.
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
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'max-h-[88%] flex flex-col',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + header */}
        <div className="flex shrink-0 flex-col px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-extrabold text-foreground">חבר צוות חדש</h2>
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
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-5 pb-2">

          {/* User picker */}
          <FormField label="קישור למשתמש *">
            {eligibleUsers.length === 0 ? (
              <p className="text-[13px] text-gray-400 dark:text-gray-500">
                כל המשתמשים כבר מקושרים כנותני שירות
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {eligibleUsers.map((user) => {
                  const selected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={[
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-right transition-colors',
                        selected
                          ? 'bg-[#2d2d3a] dark:bg-[#3d3d4a] border-transparent text-white'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                      ].join(' ')}
                    >
                      <span className="text-[13px] font-medium">{roleLabel(user.role)}</span>
                      <span
                        className={[
                          'text-[11px] font-mono',
                          selected ? 'text-gray-300' : 'text-gray-400',
                        ].join(' ')}
                      >
                        …{user.id.slice(-6)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          {/* Display name */}
          <FormField label="שם תצוגה *">
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
          <FormField label="שירותים *">
            {activeServices.length === 0 ? (
              <p className="text-[13px] text-gray-400 dark:text-gray-500">
                אין שירותים פעילים בעסק
              </p>
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
                        'text-[13px] font-medium px-3 py-2 rounded-full border transition-colors',
                        selected
                          ? 'bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                      ].join(' ')}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          {/* Inline validation hint */}
          {selectedIds.size === 0 && activeServices.length > 0 && (
            <p className="text-[12px] text-orange-500 -mt-2">
              יש לבחור לפחות שירות אחד
            </p>
          )}
        </div>

        {/* Error + submit */}
        <div className="px-4 pt-4 pb-8 shrink-0 flex flex-col gap-3">
          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full h-12 rounded-2xl bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'הוסף חבר צוות'}
          </button>
        </div>
      </div>
    </div>
  );
}
