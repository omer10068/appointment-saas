import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { DashboardSidebar } from './_components/DashboardSidebar';
import { DashboardHeader } from './_components/DashboardHeader';
import { DashboardI18nProvider } from './_i18n/DashboardI18nProvider';
import { getDictionary } from './_i18n/dictionaries';
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from './_i18n/config';
import { THEME_COOKIE, DEFAULT_THEME, isValidTheme } from './_theme/config';
import { DashboardBusinessProvider, BUSINESS_COOKIE } from './_business/DashboardBusinessProvider';

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

export default async function DashboardLayout({
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

  const rawTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isValidTheme(rawTheme) ? rawTheme : DEFAULT_THEME;

  const rawBusinessId = cookieStore.get(BUSINESS_COOKIE)?.value ?? null;

  const businesses = await fetchMyBusinesses(token ?? '');

  return (
    <DashboardI18nProvider dict={dict}>
      <DashboardBusinessProvider
        initialBusinesses={businesses}
        initialSelectedId={rawBusinessId}
      >
        <div
          className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950${theme === 'dark' ? ' dark' : ''}`}
          dir={dict.dir}
          lang={dict.lang}
        >
          <DashboardSidebar dict={dict} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <DashboardHeader dict={dict} theme={theme} />
            <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
              {children}
            </main>
          </div>
        </div>
      </DashboardBusinessProvider>
    </DashboardI18nProvider>
  );
}
