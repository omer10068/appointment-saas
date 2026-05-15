'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; exact?: boolean };

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/appointments', label: 'Appointments' },
  { href: '/dashboard/calendar', label: 'Calendar' },
  { href: '/dashboard/customers', label: 'Customers' },
  { href: '/dashboard/services', label: 'Services' },
  { href: '/dashboard/staff', label: 'Staff' },
  { href: '/dashboard/availability', label: 'Availability' },
  { href: '/dashboard/business-profile', label: 'Business Profile' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/dashboard/reports', label: 'Reports' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          My Business
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) =>
          isActive(pathname, item.href, item.exact) ? (
            <span
              key={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-semibold bg-indigo-50 text-indigo-700 cursor-default"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
