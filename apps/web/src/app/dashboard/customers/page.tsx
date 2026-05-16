'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { DashboardCustomerDto, CustomerStatus } from '@appointment/contracts';
import { useDashboardBusiness } from '../_business/useDashboardBusiness';
import { useDashboardI18n } from '../_i18n/useDashboardI18n';
import { DashboardPageHeader } from '../_components/DashboardPageHeader';
import { fetchDashboardCustomers } from '../../../lib/api';

function statusLabel(
  status: CustomerStatus,
  t: ReturnType<typeof useDashboardI18n>['customersList'],
): string {
  if (status === 'ACTIVE') return t.statusActive;
  if (status === 'BLOCKED') return t.statusBlocked;
  return t.statusArchived;
}

function CustomerRow({
  customer,
  t,
}: {
  customer: DashboardCustomerDto;
  t: ReturnType<typeof useDashboardI18n>['customersList'];
}) {
  const isActive = customer.status === 'ACTIVE';
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {customer.fullName}
        </p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {customer.email ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {customer.phone ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
              : 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
          }`}
        >
          {statusLabel(customer.status, t)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-40 truncate">
        {customer.notes ?? ''}
      </td>
    </tr>
  );
}

export default function CustomersPage() {
  const { currentBusiness } = useDashboardBusiness();
  const dict = useDashboardI18n();
  const t = dict.customersList;
  const p = dict.pages.customers;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [customers, setCustomers] = useState<DashboardCustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessId = currentBusiness?.business.id;

  useEffect(() => {
    if (!businessId) {
      setCustomers([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setCustomers([]);

    fetchDashboardCustomers(businessId, () => getTokenRef.current())
      .then((data) => {
        if (!cancelled) setCustomers(data);
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
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-lg bg-white dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.noCustomersYet}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {t.noCustomersDescription}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.customerName}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.email}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.phone}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.status}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    {t.notes}
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <CustomerRow
                    key={customer.businessCustomerId}
                    customer={customer}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
