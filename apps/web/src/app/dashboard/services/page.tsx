'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { DashboardServiceDto } from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { fetchDashboardServices } from '../../../lib/api';

function formatPrice(priceCents: number | null, freeLabel: string): string {
  if (priceCents === null) return '—';
  if (priceCents === 0) return freeLabel;
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

function ServiceRow({
  svc,
  t,
}: {
  svc: DashboardServiceDto;
  t: ReturnType<typeof useDashboardI18n>['servicesList'];
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {svc.name}
        </p>
        {svc.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {svc.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {svc.durationMinutes} {t.minutes}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {formatPrice(svc.priceCents, t.free)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            svc.isActive
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              : 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
          }`}
        >
          {svc.isActive ? t.active : t.inactive}
        </span>
      </td>
    </tr>
  );
}

export default function ServicesPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.servicesList;
  const p = dict.pages.services;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [services, setServices] = useState<DashboardServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessId = currentBusiness?.business.id;

  useEffect(() => {
    if (!businessId) {
      setServices([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setServices([]);

    fetchDashboardServices(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setServices(data);
      })
      .catch(() => {
        if (!cancelled) setError('error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return (
    <>
      <DashboardPageHeader title={p.title} description={p.description} />

      {!currentBusiness ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dict.overview.noBusinessAssigned}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.noServicesYet}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {t.noServicesDescription}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.serviceName}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.duration}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.price}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.active}
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <ServiceRow key={svc.id} svc={svc} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
