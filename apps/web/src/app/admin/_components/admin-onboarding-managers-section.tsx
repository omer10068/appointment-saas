'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { createAdminManager, type AdminOnboardingSummaryDto } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  businessId: string;
  users: AdminOnboardingSummaryDto['users'];
}

export function ManagersSection({ businessId, users }: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (formStatus !== 'success') return;
    const t = setTimeout(() => setFormStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [formStatus]);

  const managers = users.filter((u) => u.role === 'MANAGER');

  const handleAdd = async () => {
    let valid = true;
    if (!email.trim()) {
      setEmailErr('אימייל נדרש');
      valid = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailErr('כתובת אימייל לא תקינה');
      valid = false;
    } else {
      setEmailErr('');
    }
    if (!phone.trim()) {
      setPhoneErr('טלפון נדרש');
      valid = false;
    } else {
      setPhoneErr('');
    }
    if (!valid) return;

    setFormStatus('submitting');
    try {
      await createAdminManager(
        businessId,
        { email: email.trim().toLowerCase(), phone: phone.trim(), role: 'MANAGER' },
        getToken,
      );
      setEmail('');
      setPhone('');
      setFormStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה ביצירת המנהל';
      if (err instanceof ApiError) {
        if (err.status === 409) msg = 'משתמש עם אימייל זה כבר קיים בעסק';
        else if (err.status === 502) msg = 'שגיאה בחיבור ל-Clerk — נסה שוב';
        else if (err.status === 400) msg = `שגיאת קלט: ${err.message}`;
        else msg = err.message;
      }
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
      {managers.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {m.user.email ?? m.user.phone}
            </p>
            {m.user.email && (
              <p className="text-xs text-muted-foreground">{m.user.phone}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              m.status === 'ACTIVE'
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {m.status === 'ACTIVE' ? 'פעיל' : m.status}
          </span>
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
        <p className="mb-3 text-sm font-semibold text-foreground">הוסף מנהל</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="mgr-email" className="block text-xs font-medium text-foreground">
              אימייל
            </label>
            <input
              id="mgr-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr('');
                if (formStatus === 'error') setFormStatus('idle');
              }}
              placeholder="manager@example.com"
              disabled={formStatus === 'submitting'}
              className={inputCls(!!emailErr)}
            />
            {emailErr ? (
              <p className="mt-0.5 text-xs text-red-500">{emailErr}</p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                האימייל ישמש להתחברות דרך Clerk
              </p>
            )}
          </div>
          <div>
            <label htmlFor="mgr-phone" className="block text-xs font-medium text-foreground">
              טלפון
            </label>
            <input
              id="mgr-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneErr('');
                if (formStatus === 'error') setFormStatus('idle');
              }}
              placeholder="+972501234567"
              disabled={formStatus === 'submitting'}
              className={inputCls(!!phoneErr)}
            />
            {phoneErr ? (
              <p className="mt-0.5 text-xs text-red-500">{phoneErr}</p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                פרטי קשר פנימיים — לא משמש לאימות
              </p>
            )}
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
            <p className="text-xs font-medium text-green-700">המנהל נוצר ויופיע ברשימה</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            void handleAdd();
          }}
          disabled={formStatus === 'submitting'}
          className="mt-4 w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {formStatus === 'submitting' ? 'מוסיף מנהל...' : '+ הוסף מנהל'}
        </button>
      </div>
    </div>
  );
}
