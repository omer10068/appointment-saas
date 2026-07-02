import { SignIn } from '@clerk/nextjs';
import { CalendarClock } from 'lucide-react';

export default function SignInPage() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 sm:py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--accent)_0%,transparent_60%)] opacity-80"
      />

      {/*
        Clerk reuses the same "footerAction" element for two different
        links depending on the step: "Don't have an account? Sign up" on
        the initial screen, and "Use another method" on later steps
        (password, verification). Hiding it via the appearance API would
        hide both. This rule targets only the sign-up prompt by its
        localization key, leaving "Use another method" intact everywhere
        else.
      */}
      <style>{`
        .cl-footerAction:has([data-localization-key="signIn.start.actionLink"]) {
          display: none;
        }
      `}</style>

      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-foreground/10">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <CalendarClock className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              Appointment SaaS
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              התחברות לניהול העסק שלך
            </p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <SignIn
          appearance={{
            variables: {
              colorPrimary: 'var(--primary)',
              colorBackground: 'var(--card)',
              colorText: 'var(--foreground)',
              colorTextSecondary: 'var(--muted-foreground)',
              colorInputBackground: 'var(--card)',
              colorInputText: 'var(--foreground)',
              fontFamily: 'var(--font-sans)',
              borderRadius: 'var(--radius)',
            },
            elements: {
              rootBox: 'w-full',
              cardBox: '!w-[24rem] !rounded-none !shadow-none',
              card: 'w-full !rounded-none !border-none !shadow-none !bg-transparent !p-0 !m-0',
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
              main: 'gap-5 px-6 pb-2',
              socialButtonsBlockButton: 'h-11 rounded-xl',
              socialButtonsBlockButtonText: 'text-sm font-medium',
              dividerRow: 'my-1',
              formFieldInput: 'h-11 rounded-xl',
              formButtonPrimary:
                'h-11 rounded-xl text-sm font-semibold normal-case',
              footer: 'px-6 pb-6 pt-4 bg-transparent',
              // The OTP digit boxes must read left-to-right even on this
              // RTL page — codes are numeric, not Hebrew text.
              otpCodeField: { direction: 'ltr' },
            },
          }}
        />
      </div>
    </main>
  );
}
