import { auth } from '@clerk/nextjs/server';
import type { BusinessUserWithBusinessDto } from '@appointment/contracts';
import { DashboardPageHeader } from './_components/DashboardPageHeader';
import { DashboardCard } from './_components/DashboardCard';

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
  const { getToken } = await auth();
  const token = await getToken();
  const businesses = await fetchMyBusinesses(token ?? '');

  return (
    <>
      <DashboardPageHeader
        title="Overview"
        description="Welcome back. Here's a summary of your business activity."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <DashboardCard title="Today's Appointments" description="Appointments scheduled for today" />
        <DashboardCard title="Upcoming Appointments" description="Next 7 days" />
        <DashboardCard title="Active Customers" description="Customers with recent activity" />
        <DashboardCard title="Services" description="Services you offer" />
        <DashboardCard title="Staff Members" description="Active staff" />
        <DashboardCard title="Monthly Bookings" description="Bookings this month" />
      </div>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Your Businesses
        </h2>

        {businesses.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No businesses assigned to your account. Contact your platform
            administrator to get access.
          </p>
        ) : (
          <div className="space-y-3">
            {businesses.map((bu) => (
              <div
                key={bu.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {bu.business.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bu.business.slug} &middot; Role: {bu.role} &middot; Status:{' '}
                    {bu.status}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
