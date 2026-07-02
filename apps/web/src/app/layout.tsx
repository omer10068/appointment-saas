import { ClerkProvider } from '@clerk/nextjs';
import { heIL } from '@clerk/localizations';
import { Heebo, Rubik } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import './globals.css';

// Clerk's localization strings for the two email fields, worded to match
// the product's existing Hebrew tone ("אימייל") rather than the package's
// more formal default ("דוא"ל").
const clerkLocalization = {
  ...heIL,
  formFieldLabel__emailAddress: 'כתובת אימייל',
  formFieldInputPlaceholder__emailAddress: 'הזן את כתובת האימייל שלך',
};

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-heebo',
  fallback: ['Arial', 'sans-serif'],
});

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-rubik',
  fallback: ['Arial', 'sans-serif'],
});

// All pages are rendered at request time — no static pre-rendering during build.
// This allows next build to succeed without real Clerk env vars being present.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Appointment SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={clerkLocalization}>
      <html lang="en" className={`${heebo.variable} ${rubik.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
