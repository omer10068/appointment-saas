'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { createAdminService, type AdminOnboardingSummaryDto } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  businessId: string;
  services: AdminOnboardingSummaryDto['services'];
}

export function ServicesSection({ businessId, services }: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [durationErr, setDurationErr] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (formStatus !== 'success') return;
    const t = setTimeout(() => setFormStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [formStatus]);

  const handleCreate = async () => {
    let valid = true;
    if (!name.trim()) {
      setNameErr('שם השירות נדרש');
      valid = false;
    } else {
      setNameErr('');
    }
    const dur = parseInt(duration, 10);
    if (!duration.trim() || isNaN(dur) || dur < 5 || dur > 480) {
      setDurationErr('משך חייב להיות בין 5 ל-480 דקות');
      valid = false;
    } else {
      setDurationErr('');
    }
    if (!valid) return;

    const priceRaw = price.trim().replace(',', '.');
    const priceFloat = priceRaw ? parseFloat(priceRaw) : null;
    const priceCents =
      priceFloat != null && !isNaN(priceFloat) ? Math.round(priceFloat * 100) : null;

    setFormStatus('submitting');
    try {
      await createAdminService(
        businessId,
        { name: name.trim(), durationMinutes: dur, priceCents },
        getToken,
      );
      setName('');
      setDuration('60');
      setPrice('');
      setFormStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה ביצירת השירות';
      if (err instanceof ApiError) msg = err.message;
      setErrorMsg(msg);
      setFormStatus('error');
    }
  };

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 ${
      hasError ? 'border-red-400' : 'border-border'
    }`;

  return (
    <div className="space-y-2">
      {services.map((s) => (
        <div
          key={s.id}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            s.isActive ? 'border-border bg-card' : 'border-border bg-muted/30 opacity-70'
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.durationMinutes} דקות
              {s.priceCents != null ? ` · ₪${(s.priceCents / 100).toFixed(0)}` : ''}
            </p>
          </div>
          {!s.isActive && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              לא פעיל
            </span>
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
        <p className="mb-3 text-sm font-semibold text-foreground">הוסף שירות</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="svc-name" className="block text-xs font-medium text-foreground">
              שם השירות
            </label>
            <input
              id="svc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameErr('');
                if (formStatus === 'error') setFormStatus('idle');
              }}
              placeholder="למשל: תספורת גברים"
              disabled={formStatus === 'submitting'}
              className={inputCls(!!nameErr)}
            />
            {nameErr && <p className="mt-0.5 text-xs text-red-500">{nameErr}</p>}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="svc-dur" className="block text-xs font-medium text-foreground">
                משך (דקות)
              </label>
              <input
                id="svc-dur"
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  setDurationErr('');
                  if (formStatus === 'error') setFormStatus('idle');
                }}
                disabled={formStatus === 'submitting'}
                className={inputCls(!!durationErr)}
              />
              {durationErr && <p className="mt-0.5 text-xs text-red-500">{durationErr}</p>}
            </div>
            <div className="flex-1">
              <label htmlFor="svc-price" className="block text-xs font-medium text-foreground">
                מחיר ₪ (אופציונלי)
              </label>
              <input
                id="svc-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (formStatus === 'error') setFormStatus('idle');
                }}
                placeholder="0"
                disabled={formStatus === 'submitting'}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {formStatus === 'error' && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">{errorMsg}</p>
          </div>
        )}
        {formStatus === 'success' && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
            <Check size={12} className="text-green-600" />
            <p className="text-xs font-medium text-green-700">השירות נוצר בהצלחה</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            void handleCreate();
          }}
          disabled={formStatus === 'submitting'}
          className="mt-4 w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {formStatus === 'submitting' ? 'יוצר שירות...' : '+ הוסף שירות'}
        </button>
      </div>
    </div>
  );
}
