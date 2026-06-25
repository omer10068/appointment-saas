'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import {
  setAdminBusinessWorkingHours,
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

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface Props {
  businessId: string;
  businessWorkingHours: AdminOnboardingSummaryDto['businessWorkingHours'];
}

export function BusinessHoursSection({ businessId, businessWorkingHours }: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Initialize once from summary data on mount
  const [hours, setHours] = useState<HourRow[]>(() =>
    businessWorkingHours.length > 0 ? initHoursFromData(businessWorkingHours) : defaultHours(),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleDayChange(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setIsDirty(true);
    if (saveStatus !== 'idle') setSaveStatus('idle');
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      const result = await setAdminBusinessWorkingHours(
        businessId,
        {
          hours: hours.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            isClosed: r.isClosed,
            startTime: r.isClosed ? null : r.startTime,
            endTime: r.isClosed ? null : r.endTime,
          })),
        },
        getToken,
      );
      setHours(initHoursFromData(result));
      setIsDirty(false);
      setSaveStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
      setTimeout(
        () => setSaveStatus((s) => (s === 'success' ? 'idle' : s)),
        3000,
      );
    } catch (err) {
      let msg = 'שגיאה בשמירת שעות העסק';
      if (err instanceof ApiError) {
        if (err.status === 400) {
          msg = 'שגיאת קלט — בדוק שכל ימי הפתיחה כוללים שעות תקינות (HH:mm) וששעת הסגירה אחרי הפתיחה';
        } else {
          msg = err.message;
        }
      }
      setErrorMsg(msg);
      setSaveStatus('error');
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        הגדר את שעות הפתיחה השבועיות של העסק. שעות ספקי השירות ניתנות להגדרה בנפרד בסעיף הבא.
      </p>

      <WeekHoursEditor
        hours={hours}
        onDayChange={handleDayChange}
        disabled={saveStatus === 'saving'}
      />

      {saveStatus === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{errorMsg}</p>
        </div>
      )}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
          <Check size={12} className="text-green-600" />
          <p className="text-xs font-medium text-green-700">שעות העסק נשמרו בהצלחה</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          void handleSave();
        }}
        disabled={!isDirty || saveStatus === 'saving'}
        className="w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity active:opacity-80 disabled:opacity-40"
      >
        {saveStatus === 'saving' ? 'שומר...' : 'שמור שעות עסק'}
      </button>
    </div>
  );
}
