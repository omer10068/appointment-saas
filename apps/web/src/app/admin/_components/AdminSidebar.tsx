'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; exact?: boolean };

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/businesses', label: 'Businesses' },
  { href: '/admin/business-users', label: 'Business Users' },
  { href: '/admin/owners', label: 'Owners' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Platform Admin
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
