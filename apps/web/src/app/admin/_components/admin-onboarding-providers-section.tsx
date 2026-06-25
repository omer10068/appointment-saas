'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { createAdminServiceProvider, type AdminOnboardingSummaryDto } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { onboardingSummaryKey } from '../_hooks/use-admin-onboarding-summary';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  businessId: string;
  users: AdminOnboardingSummaryDto['users'];
  services: AdminOnboardingSummaryDto['services'];
  serviceProviders: AdminOnboardingSummaryDto['serviceProviders'];
}

interface FormErrors {
  displayName?: string;
  userId?: string;
  services?: string;
}

export function ProvidersSection({
  businessId,
  users,
  services,
  serviceProviders,
}: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Users who already have a linked ServiceProvider (by businessUserId = BusinessUser.id)
  const usedUserIds = new Set(serviceProviders.map((sp) => sp.businessUserId));
  const eligibleUsers = users.filter((u) => u.status === 'ACTIVE' && !usedUserIds.has(u.id));
  const activeServices = services.filter((s) => s.isActive);

  const [displayName, setDisplayName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (formStatus !== 'success') return;
    const t = setTimeout(() => setFormStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [formStatus]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
    if (formErrors.services) setFormErrors((p) => ({ ...p, services: undefined }));
    if (formStatus === 'error') setFormStatus('idle');
  };

  const handleCreate = async () => {
    const errs: FormErrors = {};
    if (!displayName.trim()) errs.displayName = 'שם הצגה נדרש';
    if (!selectedUserId) errs.userId = 'יש לבחור משתמש מקושר';
    if (selectedServiceIds.length === 0) errs.services = 'יש לבחור לפחות שירות אחד';
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setFormStatus('submitting');
    try {
      await createAdminServiceProvider(
        businessId,
        {
          displayName: displayName.trim(),
          businessUserId: selectedUserId,
          serviceIds: selectedServiceIds,
        },
        getToken,
      );
      setDisplayName('');
      setSelectedUserId('');
      setSelectedServiceIds([]);
      setFormErrors({});
      setFormStatus('success');
      void queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) });
    } catch (err) {
      let msg = 'שגיאה ביצירת היומן';
      if (err instanceof ApiError) {
        if (err.status === 409) msg = 'משתמש זה כבר מקושר ליומן קיים';
        else if (err.status === 400) msg = `שגיאת קלט: ${err.message}`;
        else msg = err.message;
      }
      setErrorMsg(msg);
      setFormStatus('error');
    }
  };

  const inputCls = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 ${
      hasError ? 'border-red-400' : 'border-border'
    }`;

  // Prerequisites check: need active services AND eligible users
  const noServices = activeServices.length === 0;
  const noEligibleUsers = eligibleUsers.length === 0;
  const canCreate = !noServices && !noEligibleUsers;

  return (
    <div className="space-y-2">
      {/* Existing providers list */}
      {serviceProviders.map((sp) => {
        const linkedUser = users.find((u) => u.id === sp.businessUserId);
        return (
          <div
            key={sp.id}
            className={`rounded-xl border px-4 py-3 ${
              sp.isActive ? 'border-border bg-card' : 'border-border bg-muted/30 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{sp.displayName}</p>
              {!sp.isActive && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  לא פעיל
                </span>
              )}
            </div>
            {linkedUser && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                מקושר: {linkedUser.user.email ?? linkedUser.user.phone}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sp.serviceIds.length} שירות{sp.serviceIds.length === 1 ? '' : 'ים'} ·{' '}
              {sp.hasWorkingHours ? 'שעות מוגדרות' : 'ללא שעות'}
            </p>
          </div>
        );
      })}

      {/* Prerequisite gate or create form */}
      {!canCreate ? (
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-5 text-center">
          {noServices && (
            <p className="text-sm text-muted-foreground">
              יש ליצור לפחות שירות אחד לפני הוספת יומן
            </p>
          )}
          {!noServices && noEligibleUsers && (
            <p className="text-sm text-muted-foreground">
              כל המשתמשים הפעילים כבר מקושרים ליומן — הוסף מנהל נוסף לפני יצירת יומן חדש
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
          <p className="mb-3 text-sm font-semibold text-foreground">הוסף יומן</p>
          <div className="space-y-3">
            {/* Display name */}
            <div>
              <label htmlFor="sp-name" className="block text-xs font-medium text-foreground">
                שם הצגה
              </label>
              <input
                id="sp-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setFormErrors((p) => ({ ...p, displayName: undefined }));
                  if (formStatus === 'error') setFormStatus('idle');
                }}
                placeholder="למשל: דוד כהן"
                disabled={formStatus === 'submitting'}
                className={inputCls(!!formErrors.displayName)}
              />
              {formErrors.displayName && (
                <p className="mt-0.5 text-xs text-red-500">{formErrors.displayName}</p>
              )}
            </div>

            {/* Business user selector */}
            <div>
              <label htmlFor="sp-user" className="block text-xs font-medium text-foreground">
                משתמש מקושר
              </label>
              <select
                id="sp-user"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setFormErrors((p) => ({ ...p, userId: undefined }));
                  if (formStatus === 'error') setFormStatus('idle');
                }}
                disabled={formStatus === 'submitting'}
                className={inputCls(!!formErrors.userId)}
              >
                <option value="">בחר משתמש...</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.user.email ?? u.user.phone} (
                    {u.role === 'OWNER' ? 'בעלים' : 'מנהל'})
                  </option>
                ))}
              </select>
              {formErrors.userId ? (
                <p className="mt-0.5 text-xs text-red-500">{formErrors.userId}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  כל משתמש יכול להיות מקושר ליומן אחד בלבד
                </p>
              )}
            </div>

            {/* Service checkboxes */}
            <div>
              <p className="block text-xs font-medium text-foreground">שירותים</p>
              <div
                className={`mt-1.5 space-y-2 rounded-xl border bg-background p-3 ${
                  formErrors.services ? 'border-red-400' : 'border-border'
                }`}
              >
                {activeServices.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      disabled={formStatus === 'submitting'}
                      className="h-4 w-4 rounded border-border accent-foreground disabled:opacity-50"
                    />
                    <span className="text-sm text-foreground">
                      {s.name}
                      <span className="text-muted-foreground"> · {s.durationMinutes} דקות</span>
                    </span>
                  </label>
                ))}
              </div>
              {formErrors.services && (
                <p className="mt-0.5 text-xs text-red-500">{formErrors.services}</p>
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
              <p className="text-xs font-medium text-green-700">היומן נוצר בהצלחה</p>
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
            {formStatus === 'submitting' ? 'יוצר יומן...' : '+ הוסף יומן'}
          </button>
        </div>
      )}
    </div>
  );
}
