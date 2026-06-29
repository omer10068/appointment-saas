'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import {
  setAdminBusinessStatus,
  type AdminOnboardingSummaryDto,
  type AdminReadinessChecks,
} from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';

// ─── Readiness check definitions ──────────────────────────────────────────────

interface CheckDef {
  key: keyof AdminReadinessChecks;
  label: string;
  guidance: string;
}

const READINESS_CHECKS: CheckDef[] = [
  {
    key: 'hasActiveOwner',
    label: 'בעלים פעיל',
    guidance: 'צור בעלים בסעיף הבעלים',
  },
  {
    key: 'hasActiveService',
    label: 'שירות פעיל אחד לפחות',
    guidance: 'צור או הפעל שירות בסעיף השירותים',
  },
  {
    key: 'hasActiveServiceProvider',
    label: 'יומן פעיל אחד לפחות',
    guidance: 'צור או הפעל יומן בסעיף היומנים',
  },
  {
    key: 'hasBusinessWorkingHours',
    label: 'שעות פעילות עסק מוגדרות',
    guidance: 'הגדר שעות בסעיף שעות פעילות עסק',
  },
  {
    key: 'allActiveProvidersHaveWorkingHours',
    label: 'כל היומנים הפעילים — שעות מוגדרות',
    guidance: 'הגדר שעות לכל יומן פעיל בסעיף שעות ספקי שירות',
  },
  {
    key: 'allActiveProvidersHaveActiveServiceAssignment',
    label: 'כל היומנים הפעילים — שירות מוקצה',
    guidance: 'ערוך את היומן וצרף לו שירות פעיל בסעיף היומנים',
  },
  {
    key: 'allActiveServicesHaveActiveProviderAssignment',
    label: 'כל השירותים הפעילים — יומן מוקצה',
    guidance: 'ערוך את היומן וצרף לו את השירות הרלוונטי',
  },
];

// ─── Preflight row (DRAFT mode — informational only) ──────────────────────────

function PreflightRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'
        }`}
      >
        {done ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
      </div>
      <span className={`text-xs ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Readiness row (TRIAL mode — gating) ─────────────────────────────────────

function ReadinessRow({
  done,
  label,
  guidance,
}: {
  done: boolean;
  label: string;
  guidance: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0">
      <div
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'
        }`}
      >
        {done ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {!done && <p className="mt-0.5 text-xs text-red-500">{guidance}</p>}
      </div>
      <span className={`shrink-0 text-xs ${done ? 'text-green-600' : 'text-red-400'}`}>
        {done ? 'תקין' : 'נדרש'}
      </span>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

type ActionStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  businessId: string;
  summary: AdminOnboardingSummaryDto;
}

export function LifecycleSection({ businessId, summary }: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [draftStatus, setDraftStatus] = useState<ActionStatus>('idle');
  const [draftError, setDraftError] = useState('');
  const [activationStatus, setActivationStatus] = useState<ActionStatus>('idle');
  const [activationError, setActivationError] = useState('');

  const { business, readiness } = summary;
  const { checks } = readiness;

  // Use local success states as early indicators before the summary refetch completes.
  const isActive = activationStatus === 'success' || business.status === 'ACTIVE';
  const isTrial =
    !isActive && (business.status === 'TRIAL' || draftStatus === 'success');
  // isDraft = !isActive && !isTrial (implicit via ordering of renders below)

  // DRAFT → TRIAL: backend has no readiness requirement for this transition
  async function handleOpenDashboard() {
    setDraftStatus('submitting');
    setDraftError('');
    try {
      await setAdminBusinessStatus(businessId, 'TRIAL', getToken);
      setDraftStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה בפתיחת הגישה לדשבורד';
      if (err instanceof ApiError) {
        if (err.status === 409) msg = 'לא ניתן לפתוח גישה — העסק אינו במצב טיוטה';
        else if (err.status === 400) msg = `שגיאת קלט: ${err.message}`;
        else msg = err.message;
      }
      setDraftError(msg);
      setDraftStatus('error');
    }
  }

  // TRIAL → ACTIVE: requires readiness.isReady on backend
  async function handleActivate() {
    setActivationStatus('submitting');
    setActivationError('');
    try {
      await setAdminBusinessStatus(businessId, 'ACTIVE', getToken);
      setActivationStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה בהפעלת העסק';
      if (err instanceof ApiError) {
        if (err.status === 400) {
          // Not ready — refetch to get current readiness state
          void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
          msg = 'העסק אינו עומד בדרישות המוכנות — בדוק את הרשימה ותקן את הסעיפים החסרים';
        } else if (err.status === 409) {
          void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
          msg = 'לא ניתן להפעיל — בדוק את מצב העסק';
        } else {
          msg = err.message;
        }
      }
      setActivationError(msg);
      setActivationStatus('error');
    }
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────────

  if (isActive) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Check size={18} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">העסק פעיל</p>
            <p className="mt-0.5 text-xs text-green-700">
              כל דרישות המוכנות הושלמו. OWNER ו-MANAGER יכולים להתחבר לאפליקציה.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-foreground">מצב מוכנות</p>
          {READINESS_CHECKS.map((def) => (
            <div key={def.key} className="flex items-center gap-2.5 border-b border-border py-2 last:border-0">
              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Check size={9} strokeWidth={3} className="text-green-600" />
              </div>
              <span className="flex-1 text-xs text-foreground">{def.label}</span>
              <span className="shrink-0 text-xs text-green-600">תקין</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── TRIAL ───────────────────────────────────────────────────────────────────

  if (isTrial) {
    return (
      <div className="space-y-3">
        {/* Access-open badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Check size={14} className="text-blue-600" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-medium text-blue-800">הגישה לדשבורד פתוחה — מצב ניסיון</p>
        </div>

        {/* Readiness checklist */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="mb-0.5 text-xs font-semibold text-foreground">בדיקת מוכנות להפעלה</p>
          <p className="mb-3 text-xs text-muted-foreground">
            {readiness.isReady
              ? 'כל הדרישות הושלמו — העסק מוכן להפעלה.'
              : 'יש להשלים את הסעיפים המסומנים לפני שניתן להפעיל את העסק.'}
          </p>
          {READINESS_CHECKS.map((def) => (
            <ReadinessRow
              key={def.key}
              done={checks[def.key]}
              label={def.label}
              guidance={def.guidance}
            />
          ))}
        </div>

        {/* Activation error */}
        {activationStatus === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">{activationError}</p>
          </div>
        )}

        {/* Activation CTA */}
        {readiness.isReady ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                void handleActivate();
              }}
              disabled={activationStatus === 'submitting'}
              className="w-full rounded-2xl bg-green-600 py-4 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40 hover:bg-green-700"
            >
              {activationStatus === 'submitting' ? 'מפעיל עסק...' : 'הפעל עסק'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              מעבר: ניסיון → פעיל (TRIAL → ACTIVE)
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              כפתור ההפעלה יהיה זמין לאחר השלמת כל הדרישות המסומנות.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── DRAFT ────────────────────────────────────────────────────────────────────

  const preflightItems = [
    { done: checks.hasActiveOwner, label: 'בעלים פעיל' },
    { done: checks.hasActiveService, label: 'שירות פעיל אחד לפחות' },
    { done: checks.hasActiveServiceProvider, label: 'יומן פעיל אחד לפחות' },
    { done: checks.hasBusinessWorkingHours, label: 'שעות פעילות עסק מוגדרות' },
    { done: checks.allActiveProvidersHaveWorkingHours, label: 'כל היומנים הפעילים בעלי שעות' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        לאחר פתיחת הגישה, OWNER ו-MANAGER יוכלו להתחבר לאפליקציית הדשבורד.
        הפעולה מעבירה את העסק ממצב <strong>טיוטה</strong> למצב <strong>ניסיון</strong> ואינה מפעילה אותו סופית.
      </p>

      {/* Factual preflight — informational only, does not gate the CTA */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-foreground">בדיקת מוכנות (מידע בלבד)</p>
        {preflightItems.map((item) => (
          <PreflightRow key={item.label} done={item.done} label={item.label} />
        ))}
        <p className="mt-1.5 text-xs text-muted-foreground">
          ניתן לפתוח גישה גם לפני השלמת כל הפריטים — ניתן להשלים אחר כך מהאפליקציה.
        </p>
      </div>

      {draftStatus === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{draftError}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          void handleOpenDashboard();
        }}
        disabled={draftStatus === 'submitting'}
        className="w-full rounded-2xl bg-foreground py-4 text-sm font-semibold text-background transition-opacity active:opacity-80 disabled:opacity-40"
      >
        {draftStatus === 'submitting' ? 'פותח גישה...' : 'פתח גישה לדשבורד'}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        מעבר: טיוטה → ניסיון (DRAFT → TRIAL)
      </p>
    </div>
  );
}
