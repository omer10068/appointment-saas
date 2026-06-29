'use client';

import Link from 'next/link';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from './admin-header';
import { AdminBottomNav } from './admin-bottom-nav';
import { useCreateBusinessForm } from '../_hooks/use-create-business-form';

// ─── Shared form field ────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  id: string;
  type?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
}

function FormField({
  label,
  id,
  type = 'text',
  inputMode,
  value,
  onChange,
  placeholder,
  helper,
  error,
  disabled,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/40',
          'disabled:opacity-50',
          error ? 'border-red-400' : 'border-border',
        ].join(' ')}
      />
      {helper && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Status banners ───────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">שגיאה</p>
      <p className="mt-0.5 text-sm text-red-600 dark:text-red-300">{message}</p>
    </div>
  );
}

function PartialBanner({
  businessId,
  ownerError,
}: {
  businessId: string;
  ownerError: string;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-700 dark:bg-amber-950/40">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        העסק נוצר, אך יצירת הבעלים נכשלה
      </p>
      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{ownerError}</p>
      <p className="mt-2 font-mono text-xs text-amber-600 dark:text-amber-500">
        {businessId}
      </p>
      <Link
        href={`/admin/businesses/${businessId}/onboarding`}
        className="mt-3 inline-block text-sm font-semibold text-amber-800 underline dark:text-amber-300"
      >
        המשך להקמה ←
      </Link>
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

export function AdminNewBusinessShell() {
  const { fields, errors, submitState, setField, handleSubmit } =
    useCreateBusinessForm();

  const isSubmitting = submitState.type === 'submitting';
  const isPartial = submitState.type === 'partial';

  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="עסק חדש" subtitle="הקמה מודרכת" />

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {/* ── Section 1: business details ── */}
        <div className="mt-4 mb-6">
          <SectionLabel>פרטי העסק</SectionLabel>
          <div className="space-y-4">
            <FormField
              label="שם העסק"
              id="name"
              value={fields.name}
              onChange={(v) => setField('name', v)}
              placeholder="למשל: מספרה של דוד"
              error={errors.name}
              disabled={isSubmitting}
            />
            <FormField
              label="כתובת URL"
              id="slug"
              value={fields.slug}
              onChange={(v) => setField('slug', v.toLowerCase())}
              placeholder="davids-barbershop"
              helper="אותיות קטנות באנגלית, ספרות ומקפים בלבד"
              error={errors.slug}
              disabled={isSubmitting}
            />
            <FormField
              label="אזור זמן"
              id="timezone"
              value={fields.timezone}
              onChange={(v) => setField('timezone', v)}
              placeholder="Asia/Jerusalem"
              helper="שם IANA — לדוגמה: Asia/Jerusalem, Europe/London"
              error={errors.timezone}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ── Section 2: primary owner ── */}
        <div className="mb-6">
          <SectionLabel>בעלים ראשי</SectionLabel>

          {/* What to collect from the owner */}
          <div className="mb-4 rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs font-semibold text-foreground">מה לבקש מבעל העסק:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              <li>· כתובת אימייל לכניסה למערכת</li>
              <li>· מספר טלפון לפרטי קשר פנימיים</li>
            </ul>
          </div>

          <div className="space-y-4">
            <FormField
              label="אימייל"
              id="ownerEmail"
              type="email"
              inputMode="email"
              value={fields.ownerEmail}
              onChange={(v) => setField('ownerEmail', v)}
              placeholder="owner@example.com"
              helper="האימייל ישמש להתחברות דרך Clerk"
              error={errors.ownerEmail}
              disabled={isSubmitting}
            />
            <FormField
              label="טלפון"
              id="ownerPhone"
              type="tel"
              inputMode="tel"
              value={fields.ownerPhone}
              onChange={(v) => setField('ownerPhone', v)}
              placeholder="+972501234567"
              helper="הטלפון נשמר כפרטי קשר פנימיים ואינו משמש לאימות ב־Clerk"
              error={errors.ownerPhone}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ── Status banners ── */}
        {submitState.type === 'error' && (
          <ErrorBanner message={submitState.message} />
        )}
        {isPartial && (
          <PartialBanner
            businessId={submitState.businessId}
            ownerError={submitState.ownerError}
          />
        )}

        {/* ── Submit / cancel ── */}
        {!isPartial && (
          <button
            type="button"
            onClick={() => { void handleSubmit(); }}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-foreground py-4 text-sm font-semibold text-background transition-opacity active:opacity-80 disabled:opacity-40"
          >
            {isSubmitting ? 'יוצר עסק ובעלים...' : 'צור עסק ובעלים'}
          </button>
        )}

        <div className="mt-3 mb-4 text-center">
          <Link
            href="/admin/businesses"
            className="text-sm text-muted-foreground active:text-foreground"
          >
            ביטול — חזרה לרשימה
          </Link>
        </div>
      </div>

      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
