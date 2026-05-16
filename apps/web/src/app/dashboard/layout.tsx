import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { DashboardSidebar } from './_components/DashboardSidebar';
import { DashboardHeader } from './_components/DashboardHeader';
import { DashboardI18nProvider } from './_i18n/DashboardI18nProvider';
import { getDictionary } from './_i18n/dictionaries';
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from './_i18n/config';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([currentUser(), cookies()]);
  const email = user?.emailAddresses[0]?.emailAddress;

  const rawLocale = cookieStore.get(COOKIE_NAME)?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <DashboardI18nProvider dict={dict}>
      <div
        className="flex h-screen overflow-hidden bg-gray-50"
        dir={dict.dir}
        lang={dict.lang}
      >
        <DashboardSidebar dict={dict} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardHeader email={email} dict={dict} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardI18nProvider>
  );
}
