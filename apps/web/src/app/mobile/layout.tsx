import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { DashboardI18nProvider } from '../dashboard/_i18n/DashboardI18nProvider';
import { getDictionary } from '../dashboard/_i18n/dictionaries';
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from '../dashboard/_i18n/config';
import { DashboardBusinessProvider, BUSINESS_COOKIE } from '../dashboard/_business/DashboardBusinessProvider';

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

export default async function MobileLayout({
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
    <DashboardI18nProvider dict={dict}>
      <DashboardBusinessProvider
        initialBusinesses={businesses}
        initialSelectedId={rawBusinessId}
      >
        {/*
          Mobile:  transparent wrapper — the fixed inset-0 shell inside still
                   covers the full viewport, wrapper has no visible effect.
          Desktop: scrollable centered stage. min-h-dvh fills the viewport with
                   bg-muted; overflow-y-auto lets the page scroll when the 860px
                   phone frame is taller than the viewport; flex+items-center
                   centers the frame when there is extra room.
        */}
        <div className="md:min-h-dvh md:overflow-y-auto md:flex md:items-center md:justify-center md:py-8 md:bg-muted">
          {children}
        </div>
      </DashboardBusinessProvider>
    </DashboardI18nProvider>
  );
}
