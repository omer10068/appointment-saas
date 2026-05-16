'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardDictionary } from '../_i18n/types';

type NavItem = { href: string; labelKey: keyof DashboardDictionary['nav']; exact?: boolean };

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'overview', exact: true },
  { href: '/dashboard/appointments', labelKey: 'appointments' },
  { href: '/dashboard/calendar', labelKey: 'calendar' },
  { href: '/dashboard/customers', labelKey: 'customers' },
  { href: '/dashboard/services', labelKey: 'services' },
  { href: '/dashboard/staff', labelKey: 'staff' },
  { href: '/dashboard/availability', labelKey: 'availability' },
  { href: '/dashboard/business-profile', labelKey: 'businessProfile' },
  { href: '/dashboard/settings', labelKey: 'settings' },
  { href: '/dashboard/notifications', labelKey: 'notifications' },
  { href: '/dashboard/reports', labelKey: 'reports' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DashboardSidebar({ dict }: { dict: DashboardDictionary }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-e border-gray-200 flex flex-col overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest dark:text-gray-500">
          {dict.nav.brand}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) =>
          isActive(pathname, item.href, item.exact) ? (
            <span
              key={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-semibold bg-indigo-50 text-indigo-700 cursor-default dark:bg-indigo-950 dark:text-indigo-400"
            >
              {dict.nav[item.labelKey]}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              {dict.nav[item.labelKey]}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
