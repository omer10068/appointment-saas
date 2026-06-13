'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { DashboardCustomerDto } from '@appointment/contracts';
import { fetchDashboardCustomers } from '@/lib/api';

interface UseAppCustomersResult {
  customers: DashboardCustomerDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAppCustomers(businessId: string | null): UseAppCustomersResult {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['app', 'customers', businessId] as const,
    queryFn: () => fetchDashboardCustomers(businessId!, getToken),
    enabled: !!businessId,
    staleTime: 60_000,
    retry: false,
  });

  return {
    customers: data ?? [],
    loading: isLoading,
    error: isError ? 'שגיאה בטעינת לקוחות' : null,
    refetch: () => { void refetch(); },
  };
}
