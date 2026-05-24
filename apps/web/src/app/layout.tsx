import { ClerkProvider } from '@clerk/nextjs';
import { Heebo, Rubik } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'Appointment SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${heebo.variable} ${rubik.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
