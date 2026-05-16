import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

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
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
