'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Building2, Lock } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { fetchAdminBusinesses } from '@/lib/admin-api';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';

function AdminAccessLoading() {
  return (
    <MobilePhoneFrame dir="rtl">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="flex size-12 animate-pulse items-center justify-center rounded-full bg-muted">
          <Building2 className="size-6 text-muted-foreground" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </MobilePhoneFrame>
  );
}

function AdminForbidden() {
  return (
    <MobilePhoneFrame dir="rtl">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
          <Lock className="size-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">אין הרשאת גישה</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            פאנל זה מוגבל למנהלי מערכת בלבד
          </p>
        </div>
      </div>
    </MobilePhoneFrame>
  );
}

interface Props {
  children: React.ReactNode;
}

export function AdminAccessGate({ children }: Props) {
  const { getToken } = useAuth();

  const { isLoading, error } = useQuery({
    queryKey: ['admin', 'access-check'],
    queryFn: () => fetchAdminBusinesses(getToken),
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) return <AdminAccessLoading />;

  if (error instanceof ApiError && error.status === 403) {
    return <AdminForbidden />;
  }

  return <>{children}</>;
}
