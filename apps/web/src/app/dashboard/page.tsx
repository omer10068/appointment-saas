import { auth } from '@clerk/nextjs/server';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { DashboardPageHeader } from './_components/DashboardPageHeader';
import { DashboardCard } from './_components/DashboardCard';
import { getServerDict } from './_i18n/getServerDict';

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

export default async function DashboardPage() {
  const [{ getToken }, dict] = await Promise.all([auth(), getServerDict()]);
  const token = await getToken();
  const businesses = await fetchMyBusinesses(token ?? '');
  const t = dict.overview;

  return (
    <>
      <DashboardPageHeader title={t.title} description={t.description} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <DashboardCard title={t.todayAppointments} description={t.todayAppointmentsDesc} />
        <DashboardCard title={t.upcomingAppointments} description={t.upcomingAppointmentsDesc} />
        <DashboardCard title={t.activeCustomers} description={t.activeCustomersDesc} />
        <DashboardCard title={t.services} description={t.servicesDesc} />
        <DashboardCard title={t.staffMembers} description={t.staffMembersDesc} />
        <DashboardCard title={t.monthlyBookings} description={t.monthlyBookingsDesc} />
      </div>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 dark:text-gray-100">
          {t.yourBusinesses}
        </h2>

        {businesses.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 dark:text-gray-400">{t.noBusinesses}</p>
        ) : (
          <div className="space-y-3">
            {businesses.map((bu) => (
              <div
                key={bu.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {bu.business.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">
                    {bu.business.slug} &middot; {t.roleLabel}: {bu.role} &middot; {t.statusLabel}:{' '}
                    {bu.status}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">
                  {bu.business.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
