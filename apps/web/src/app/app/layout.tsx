import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { I18nProvider } from './_providers/i18n/I18nProvider';
import { getDictionary } from './_providers/i18n/dictionaries';
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from './_providers/i18n/config';
import { BusinessProvider, BUSINESS_COOKIE } from './_providers/business/BusinessProvider';
import { QueryProvider } from '@/app/_providers/query-provider';
import { AppAccessGate } from './_components/app-access-gate';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function fetchMyBusinesses(
  token: string,
): Promise<BusinessUserWithBusinessDto[]> {
  try {
    const res = await fetch(`${API_URL}/businesses/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json() as Promise<BusinessUserWithBusinessDto[]>;
  } catch {
    return [];
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ getToken }, cookieStore] = await Promise.all([
    auth(),
    cookies(),
  ]);

  const token = await getToken();

  const rawLocale = cookieStore.get(COOKIE_NAME)?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const rawBusinessId = cookieStore.get(BUSINESS_COOKIE)?.value ?? null;

  const businesses = await fetchMyBusinesses(token ?? '');

  return (
    <QueryProvider>
      <I18nProvider dict={dict}>
        <BusinessProvider
          initialBusinesses={businesses}
          initialSelectedId={rawBusinessId}
        >
          <div className="md:min-h-dvh md:overflow-y-auto md:flex md:items-center md:justify-center md:py-8 md:bg-muted">
            <AppAccessGate>{children}</AppAccessGate>
          </div>
        </BusinessProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
