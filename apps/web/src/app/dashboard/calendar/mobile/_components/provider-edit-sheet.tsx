'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { DashboardServiceDto, DashboardServiceProviderDto } from '@appointment/contracts';
import {
  ApiError,
  updateDashboardServiceProvider,
} from '../../../../../lib/api';

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  provider: DashboardServiceProviderDto | null;
  /** All services (active + inactive) fetched by the parent shell. */
  services: DashboardServiceDto[];
  businessId: string | null;
  getToken: () => Promise<string | null>;
  onClosed: () => void;
  /** Called immediately on successful save, before the close animation. */
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
  const [visible, setVisible]         = useState(false);
  const isClosingRef                  = useRef(false);

  const [displayName, setDisplayName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isActive, setIsActive]       = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // Populate fields and animate in whenever a different provider is opened.
  useEffect(() => {
    if (!provider) return;
    setDisplayName(provider.displayName);
    setSelectedIds(new Set(provider.serviceIds));
    setIsActive(provider.isActive);
    setError(null);
    setSubmitting(false);
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id]);

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

  // Categorise services for display.
  const activeServices   = services.filter((s) => s.isActive);
  const inactiveAssigned = services.filter(
    (s) => !s.isActive && provider?.serviceIds.includes(s.id),
  );

  const isValid = displayName.trim().length > 0 && selectedIds.size > 0;

  async function handleSave() {
    if (!businessId || !provider || !isValid || submitting) return;

    const sortedInitial = [...provider.serviceIds].sort().join(',');
    const sortedCurrent = [...selectedIds].sort().join(',');
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

  if (!provider) return null;

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
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-5 pb-2">

          {/* Display name */}
          <FormField label="שם תצוגה">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </FormField>

          {/* Active services */}
          <FormField label="שירותים">
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

          {/* Inactive services that are currently assigned */}
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
                        'text-[13px] font-medium px-3 py-2 rounded-full border transition-colors opacity-60',
                        selected
                          ? 'bg-gray-400 dark:bg-gray-600 text-white border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700',
                      ].join(' ')}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </FormField>
          )}

          {/* Inline validation hint */}
          {selectedIds.size === 0 && (
            <p className="text-[12px] text-orange-500 -mt-2">
              יש לבחור לפחות שירות אחד
            </p>
          )}

          {/* Status */}
          <FormField label="סטטוס">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={[
                  'flex-1 h-9 rounded-xl text-[13px] font-medium border transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700',
                ].join(' ')}
              >
                פעיל
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={[
                  'flex-1 h-9 rounded-xl text-[13px] font-medium border transition-colors',
                  !isActive
                    ? 'bg-gray-200 text-gray-600 border-gray-300'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700',
                ].join(' ')}
              >
                לא פעיל
              </button>
            </div>
          </FormField>
        </div>

        {/* Error + submit */}
        <div className="px-4 pt-4 pb-8 shrink-0 flex flex-col gap-3">
          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid || submitting}
            className="w-full h-12 rounded-2xl bg-[#2d2d3a] dark:bg-[#3d3d4a] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}
