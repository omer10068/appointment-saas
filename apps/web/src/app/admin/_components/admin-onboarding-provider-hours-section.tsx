'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import {
  fetchAdminServiceProviderWorkingHours,
  setAdminServiceProviderWorkingHours,
  type AdminOnboardingSummaryDto,
} from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';
import {
  WeekHoursEditor,
  defaultHours,
  initHoursFromData,
  type HourRow,
} from './admin-hours-editor';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorStatus = 'loading' | 'ready' | 'saving' | 'success' | 'error';

interface EditorState {
  hours: HourRow[];
  isDirty: boolean;
  status: EditorStatus;
  errorMsg: string;
}

interface Props {
  businessId: string;
  serviceProviders: AdminOnboardingSummaryDto['serviceProviders'];
}

// ─── Skeleton for loading state ───────────────────────────────────────────────

function HoursSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function ProviderHoursSection({ businessId, serviceProviders }: Props) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    hours: defaultHours(),
    isDirty: false,
    status: 'loading',
    errorMsg: '',
  });

  // Fetch hours when a provider is expanded
  useEffect(() => {
    if (!expandedId) return;

    setEditorState({ hours: defaultHours(), isDirty: false, status: 'loading', errorMsg: '' });

    let cancelled = false;
    fetchAdminServiceProviderWorkingHours(businessId, expandedId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) {
          setEditorState({
            hours: initHoursFromData(data),
            isDirty: false,
            status: 'ready',
            errorMsg: '',
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fall back to defaults on load error — editor is still usable
          setEditorState({
            hours: defaultHours(),
            isDirty: false,
            status: 'ready',
            errorMsg: '',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expandedId, businessId]);

  function handleToggle(spId: string) {
    setExpandedId((prev) => (prev === spId ? null : spId));
  }

  function handleDayChange(dayOfWeek: number, patch: Partial<HourRow>) {
    setEditorState((prev) => ({
      ...prev,
      hours: prev.hours.map((r) =>
        r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r,
      ),
      isDirty: true,
      // Clear result banners on new edit
      status: prev.status === 'error' || prev.status === 'success' ? 'ready' : prev.status,
      errorMsg: '',
    }));
  }

  async function handleSave() {
    if (!expandedId) return;
    setEditorState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const result = await setAdminServiceProviderWorkingHours(
        businessId,
        expandedId,
        {
          hours: editorState.hours.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            isClosed: r.isClosed,
            startTime: r.isClosed ? null : r.startTime,
            endTime: r.isClosed ? null : r.endTime,
          })),
        },
        () => getTokenRef.current(),
      );
      setEditorState({
        hours: initHoursFromData(result),
        isDirty: false,
        status: 'success',
        errorMsg: '',
      });
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
      setTimeout(
        () =>
          setEditorState((prev) =>
            prev.status === 'success' ? { ...prev, status: 'ready' } : prev,
          ),
        3000,
      );
    } catch (err) {
      let msg = 'שגיאה בשמירת שעות הספק';
      if (err instanceof ApiError) {
        if (err.status === 400) {
          msg = 'שגיאת קלט — בדוק שכל ימי הפתיחה כוללים שעות תקינות וששעת הסגירה אחרי הפתיחה';
        } else if (err.status === 404) {
          msg = 'ספק השירות לא נמצא';
        } else {
          msg = err.message;
        }
      }
      setEditorState((prev) => ({ ...prev, status: 'error', errorMsg: msg }));
    }
  }

  const activeProviders = serviceProviders.filter((p) => p.isActive);

  if (activeProviders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">אין ספקי שירות פעילים להגדרת שעות</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        כל ספק שירות פעיל חייב שעות עבודה משלו — בנוסף לשעות הכלליות של העסק.
      </p>

      {activeProviders.map((sp) => {
        const isExpanded = expandedId === sp.id;
        const isSaving = isExpanded && editorState.status === 'saving';
        const isLoading = isExpanded && editorState.status === 'loading';
        const showEditor = isExpanded && editorState.status !== 'loading';
        const showSuccess = isExpanded && editorState.status === 'success';
        const showError = isExpanded && editorState.status === 'error';

        return (
          <div
            key={sp.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Provider header / toggle */}
            <button
              type="button"
              onClick={() => handleToggle(sp.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-muted/20 active:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {sp.displayName}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Clock
                    size={10}
                    className={sp.hasWorkingHours ? 'text-green-500' : 'text-amber-500'}
                  />
                  <span
                    className={`text-xs ${
                      sp.hasWorkingHours ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {sp.hasWorkingHours ? 'שעות מוגדרות' : 'ללא שעות — יש להגדיר'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 ps-3">
                <span className="text-xs font-medium text-primary">
                  {sp.hasWorkingHours ? 'ערוך' : 'הגדר'}
                </span>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Inline editor */}
            {isExpanded && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                {isLoading ? (
                  <HoursSkeleton />
                ) : showEditor ? (
                  <div className="space-y-3">
                    <WeekHoursEditor
                      hours={editorState.hours}
                      onDayChange={handleDayChange}
                      disabled={isSaving}
                    />

                    {showError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-600">{editorState.errorMsg}</p>
                      </div>
                    )}
                    {showSuccess && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                        <Check size={12} className="text-green-600" />
                        <p className="text-xs font-medium text-green-700">
                          שעות {sp.displayName} נשמרו בהצלחה
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        void handleSave();
                      }}
                      disabled={!editorState.isDirty || isSaving}
                      className="w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity active:opacity-80 disabled:opacity-40"
                    >
                      {isSaving ? 'שומר...' : `שמור שעות — ${sp.displayName}`}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
