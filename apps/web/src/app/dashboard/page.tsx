'use client';

import { useDashboardBusiness } from './_business/useDashboardBusiness';
import { useDashboardI18n } from './_i18n/useDashboardI18n';
import { DashboardPageHeader } from './_components/DashboardPageHeader';
import { DashboardCard } from './_components/DashboardCard';

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toUpperCase() === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
          : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.overview;

  if (!currentBusiness) {
    return (
      <>
        <DashboardPageHeader title={t.title} description={t.description} />
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4 dark:bg-gray-700">
            <svg
              className="w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-xs">
            {t.noBusinessAssigned}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {t.contactAdmin}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardPageHeader title={t.title} description={t.dashboardShowsDataFor} />

      {/* Selected business info card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 dark:text-gray-500">
          {t.selectedBusiness}
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentBusiness.business.name}
        </h2>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {t.businessStatus}:
            </span>
            <StatusBadge status={currentBusiness.business.status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {t.yourRole}:
            </span>
            <span>{currentBusiness.role}</span>
          </div>
        </div>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title={t.todayAppointments}
          description={t.todayAppointmentsDesc}
        />
        <DashboardCard
          title={t.upcomingAppointments}
          description={t.upcomingAppointmentsDesc}
        />
        <DashboardCard
          title={t.activeCustomers}
          description={t.activeCustomersDesc}
        />
        <DashboardCard title={t.services} description={t.servicesDesc} />
        <DashboardCard
          title={t.staffMembers}
          description={t.staffMembersDesc}
        />
        <DashboardCard
          title={t.monthlyBookings}
          description={t.monthlyBookingsDesc}
        />
      </div>
    </>
  );
}
