'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createAdminBusiness,
  createAdminBusinessOwner,
} from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { adminKeys } from '../_components/admin-access-gate';

interface FormFields {
  name: string;
  slug: string;
  timezone: string;
  ownerEmail: string;
  ownerPhone: string;
}

export interface FormErrors {
  name?: string;
  slug?: string;
  timezone?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export type SubmitState =
  | { type: 'idle' }
  | { type: 'submitting' }
  | { type: 'error'; message: string }
  | { type: 'partial'; businessId: string; ownerError: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormFields): FormErrors {
  const e: FormErrors = {};
  if (!fields.name.trim()) e.name = 'שם העסק נדרש';
  if (!fields.slug.trim()) {
    e.slug = 'כתובת URL נדרשת';
  } else if (!SLUG_PATTERN.test(fields.slug)) {
    e.slug = 'אותיות קטנות באנגלית, ספרות ומקפים בלבד (לא מתחיל/מסתיים במקף)';
  }
  if (!fields.timezone.trim()) e.timezone = 'אזור זמן נדרש';
  if (!fields.ownerEmail.trim()) {
    e.ownerEmail = 'אימייל נדרש';
  } else if (!EMAIL_PATTERN.test(fields.ownerEmail.trim())) {
    e.ownerEmail = 'כתובת אימייל לא תקינה';
  }
  if (!fields.ownerPhone.trim()) e.ownerPhone = 'טלפון נדרש';
  return e;
}

export function useCreateBusinessForm() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [fields, setFieldsState] = useState<FormFields>({
    name: '',
    slug: '',
    timezone: 'Asia/Jerusalem',
    ownerEmail: '',
    ownerPhone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ type: 'idle' });

  function setField(key: keyof FormFields, value: string) {
    setFieldsState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitState({ type: 'submitting' });

    // Step 1: create business
    let businessId: string;
    try {
      const business = await createAdminBusiness(
        {
          name: fields.name.trim(),
          slug: fields.slug.trim(),
          timezone: fields.timezone.trim(),
        },
        getToken,
      );
      businessId = business.id;
    } catch (err) {
      let message = 'שגיאה ביצירת העסק';
      if (err instanceof ApiError) {
        if (err.status === 409) message = 'כתובת ה-URL כבר קיימת במערכת — בחר כתובת אחרת';
        else if (err.status === 400) message = `שגיאת אימות: ${err.message}`;
        else message = err.message;
      }
      setSubmitState({ type: 'error', message });
      return;
    }

    // Step 2: create owner (business already exists — partial failure is possible)
    try {
      await createAdminBusinessOwner(
        businessId,
        {
          email: fields.ownerEmail.trim().toLowerCase(),
          phone: fields.ownerPhone.trim(),
        },
        getToken,
      );
    } catch (err) {
      const ownerError =
        err instanceof ApiError ? err.message : 'שגיאה לא ידועה ביצירת הבעלים';
      setSubmitState({ type: 'partial', businessId, ownerError });
      return;
    }

    // Full success
    void queryClient.invalidateQueries({ queryKey: adminKeys.businesses });
    router.push(`/admin/businesses/${businessId}/onboarding`);
  }

  return { fields, errors, submitState, setField, handleSubmit };
}
