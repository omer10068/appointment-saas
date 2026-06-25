'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { setAdminBusinessStatus, type AdminOnboardingSummaryDto } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';

// ─── Preflight row ────────────────────────────────────────────────────────────

function PreflightRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'
        }`}
      >
        {done ? (
          <Check size={9} strokeWidth={3} />
        ) : (
          <X size={9} strokeWidth={3} />
        )}
      </div>
      <span className={`text-xs ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

type TransitionStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  businessId: string;
  summary: AdminOnboardingSummaryDto;
}

export function LifecycleSection({ businessId, summary }: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [transitionStatus, setTransitionStatus] = useState<TransitionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { business, readiness } = summary;
  const { checks } = readiness;
  const isDraft = business.status === 'DRAFT';
  const isActive = business.status === 'ACTIVE';

  // Note: backend does NOT require readiness for DRAFT → TRIAL.
  // This transition is always allowed for DRAFT businesses.
  async function handleOpenDashboard() {
    setTransitionStatus('submitting');
    setErrorMsg('');
    try {
      await setAdminBusinessStatus(businessId, 'TRIAL', getToken);
      setTransitionStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה בפתיחת הגישה לדשבורד';
      if (err instanceof ApiError) {
        if (err.status === 409) {
          msg = 'לא ניתן לפתוח גישה — העסק אינו במצב טיוטה';
        } else if (err.status === 400) {
          msg = `שגיאת קלט: ${err.message}`;
        } else {
          msg = err.message;
        }
      }
      setErrorMsg(msg);
      setTransitionStatus('error');
    }
  }

  // After a successful transition, the summary will refetch and status will update.
  // Show the "open" state if either the transition just succeeded or status is no longer DRAFT.
  const isAccessOpen =
    transitionStatus === 'success' || business.status === 'TRIAL' || business.status === 'ACTIVE';

  const preflightItems = [
    { done: checks.hasActiveOwner, label: 'בעלים פעיל' },
    { done: checks.hasActiveService, label: 'שירות פעיל אחד לפחות' },
    { done: checks.hasActiveServiceProvider, label: 'יומן פעיל אחד לפחות' },
    { done: checks.hasBusinessWorkingHours, label: 'שעות פעילות עסק מוגדרות' },
    {
      done: checks.allActiveProvidersHaveWorkingHours,
      label: 'כל היומנים הפעילים בעלי שעות',
    },
  ];

  // ── Already TRIAL or ACTIVE ─────────────────────────────────────────────────

  if (isAccessOpen) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Check size={18} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">הגישה לדשבורד פתוחה</p>
            <p className="mt-0.5 text-xs text-green-700">
              {isActive
                ? 'העסק פעיל — OWNER ו-MANAGER יכולים להתחבר לאפליקציה.'
                : 'העסק במצב ניסיון — OWNER ו-MANAGER יכולים להתחבר לאפליקציה.'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            השלב הבא הוא הפעלה ל-ACTIVE לאחר בדיקת מוכנות. ניתן לבצע זאת בנפרד לאחר שהעסק פועל בפועל.
          </p>
        </div>
      </div>
    );
  }

  // ── DRAFT — show preflight + CTA ───────────────────────────────────────────

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        לאחר פתיחת הגישה, OWNER ו-MANAGER יוכלו להתחבר לאפליקציית הדשבורד.
        הפעולה מעבירה את העסק ממצב <strong>טיוטה</strong> למצב <strong>ניסיון</strong> ואינה מפעילה אותו סופית.
      </p>

      {/* Factual preflight — informational only, does not gate the CTA */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-foreground">
          בדיקת מוכנות (מידע בלבד)
        </p>
        {preflightItems.map((item) => (
          <PreflightRow key={item.label} done={item.done} label={item.label} />
        ))}
        {!isDraft && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            ניתן לפתוח גישה גם לפני השלמת כל הפריטים — ניתן להשלים אחר כך מהאפליקציה.
          </p>
        )}
      </div>

      {transitionStatus === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          void handleOpenDashboard();
        }}
        disabled={transitionStatus === 'submitting'}
        className="w-full rounded-2xl bg-foreground py-4 text-sm font-semibold text-background transition-opacity active:opacity-80 disabled:opacity-40"
      >
        {transitionStatus === 'submitting' ? 'פותח גישה...' : 'פתח גישה לדשבורד'}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        מעבר: טיוטה ← ניסיון (DRAFT → TRIAL)
      </p>
    </div>
  );
}
