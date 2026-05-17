'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { DashboardDictionary } from '../_i18n/types';

type NavItem = { href: string; labelKey: keyof DashboardDictionary['nav']; exact?: boolean };

const navItems: NavItem[] = [
  { href: '/dashboard',                  labelKey: 'overview',       exact: true },
  { href: '/dashboard/appointments',     labelKey: 'appointments' },
  { href: '/dashboard/calendar',         labelKey: 'calendar' },
  { href: '/dashboard/customers',        labelKey: 'customers' },
  { href: '/dashboard/services',         labelKey: 'services' },
  { href: '/dashboard/staff',            labelKey: 'staff' },
  { href: '/dashboard/availability',     labelKey: 'availability' },
  { href: '/dashboard/business-profile', labelKey: 'businessProfile' },
  { href: '/dashboard/settings',         labelKey: 'settings' },
  { href: '/dashboard/notifications',    labelKey: 'notifications' },
  { href: '/dashboard/reports',          labelKey: 'reports' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function NavLinks({
  dict,
  pathname,
  onNavClick,
}: {
  dict:        DashboardDictionary;
  pathname:    string;
  onNavClick?: () => void;
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
            onClick={onNavClick}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {dict.nav[item.labelKey]}
          </Link>
        )
      )}
    </nav>
  );
}

export function DashboardSidebar({
  dict,
  mobileOpen,
  onMobileClose,
}: {
  dict:          DashboardDictionary;
  mobileOpen:    boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();

  // Close on Escape key while the mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  // In RTL the panel sits at inline-start = right, so it must slide off to the right to hide.
  // In LTR it sits at inline-start = left and slides off to the left.
  const hiddenTranslate = dict.dir === 'rtl' ? 'translate-x-full' : '-translate-x-full';

  return (
    <>
      {/* ── Desktop sidebar ── always in layout flow on lg+ ──────────────────── */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 flex-col bg-white border-e border-gray-200 overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest dark:text-gray-500">
            {dict.nav.brand}
          </span>
        </div>
        <NavLinks dict={dict} pathname={pathname} />
      </aside>

      {/* ── Mobile overlay ── below lg only ──────────────────────────────────── */}

      {/* Backdrop — always in DOM so opacity transitions smoothly */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel — always in DOM so slide transition works */}
      <aside
        id="dashboard-mobile-nav"
        className={`fixed inset-y-0 inset-s-0 z-50 flex w-72 flex-col bg-white shadow-xl border-e border-gray-200 transition-transform duration-300 ease-in-out lg:hidden dark:bg-gray-900 dark:border-gray-800 ${
          mobileOpen ? 'translate-x-0' : hiddenTranslate
        }`}
        aria-label={dict.nav.brand}
      >
        {/* Drawer header: brand + close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest dark:text-gray-500">
            {dict.nav.brand}
          </span>
          <button
            onClick={onMobileClose}
            aria-label={dict.header.closeMenu}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <NavLinks dict={dict} pathname={pathname} onNavClick={onMobileClose} />
      </aside>
    </>
  );
}
