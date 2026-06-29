'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { MobilePhoneFrame } from '@/app/app/_components/mobile-phone-frame';
import { AdminHeader } from './admin-header';
import { AdminBottomNav } from './admin-bottom-nav';
import { useAdminBusinesses } from '../_hooks/use-admin-businesses';
import type { AdminBusinessListItemDto } from '@/lib/admin-api';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'טיוטה',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  TRIAL:     { label: 'ניסיון', className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' },
  ACTIVE:    { label: 'פעיל',   className: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' },
  SUSPENDED: { label: 'מושהה',  className: 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-300' },
  CANCELLED: { label: 'מבוטל', className: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function BusinessCard({ biz }: { biz: AdminBusinessListItemDto }) {
  const statusCfg = STATUS_CONFIG[biz.status] ?? {
    label: biz.status,
    className: 'bg-gray-100 text-gray-500',
  };

  return (
    <Link
      href={`/admin/businesses/${biz.id}/onboarding`}
      className="block rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition-colors active:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{biz.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">@{biz.slug}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}
        >
          {statusCfg.label}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{biz.timezone}</span>
        <span className={biz.publicBookingEnabled ? 'text-green-600 dark:text-green-400' : ''}>
          {biz.publicBookingEnabled ? 'הזמנה פתוחה' : 'פנימי בלבד'}
        </span>
        <span>נוצר: {formatDate(biz.createdAt)}</span>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700" />
        </div>
        <div className="h-5 w-14 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 flex gap-4">
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function AdminBusinessesShell() {
  const { businesses, loading, error, refetch } = useAdminBusinesses();

  let listContent: React.ReactNode;

  if (loading) {
    listContent = (
      <div className="animate-pulse space-y-3 py-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  } else if (error) {
    listContent = (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="font-semibold text-foreground">שגיאה בטעינת עסקים</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-xl bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          נסה שוב
        </button>
      </div>
    );
  } else if (businesses.length === 0) {
    listContent = (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Building2 className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">אין עסקים במערכת עדיין</p>
          <p className="mt-1 text-sm text-muted-foreground">
            צרו עסק חדש כדי להתחיל
          </p>
        </div>
      </div>
    );
  } else {
    listContent = (
      <div className="space-y-3 py-4">
        {businesses.map((biz) => (
          <BusinessCard key={biz.id} biz={biz} />
        ))}
      </div>
    );
  }

  return (
    <MobilePhoneFrame dir="rtl">
      <AdminHeader title="עסקים" subtitle="ניהול והקמת עסקים במערכת" />
      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {listContent}
        {!loading && !error && (
          <div className="pb-4 pt-2">
            <Link
              href="/admin/businesses/new"
              className="flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-semibold text-background transition-opacity active:opacity-80"
            >
              + הקמת עסק חדש
            </Link>
          </div>
        )}
      </div>
      <AdminBottomNav activeKey="businesses" />
    </MobilePhoneFrame>
  );
}
