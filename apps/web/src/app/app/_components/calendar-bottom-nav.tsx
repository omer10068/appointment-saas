'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Home, Scissors, Settings, Users } from 'lucide-react';

// Ordered right-to-left for RTL flex: first item renders rightmost.
const NAV_ITEMS = [
  { icon: Home,     label: 'בית',      key: 'home'      },
  { icon: Calendar, label: 'יומן',     key: 'calendar'  },
  { icon: Users,    label: 'לקוחות',   key: 'customers' },
  { icon: Scissors, label: 'שירותים',  key: 'services'  },
  { icon: Settings, label: 'הגדרות',   key: 'settings'  },
] as const;

const NAV_ROUTES: Record<string, string> = {
  home:      '/app/home',
  calendar:  '/app/calendar',
  customers: '/app/customers',
  services:  '/app/services',
  settings:  '/app/settings',
};

interface Props {
  activeKey?: string;
}

export function CalendarBottomNav({ activeKey = 'calendar' }: Props) {
  const pathname = usePathname();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Clear pending state once the route has committed.
  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  // Visual active key: pending tap wins until the route commits, then real activeKey takes over.
  const displayKey = pendingKey ?? activeKey;

  return (
    <nav className="fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40">
      {/*
       * Each <Link> is flex-1 — a stable equal-width slot regardless of active state.
       * The pill lives on the inner <span> with a fixed w-14 width so every tab's
       * active pill is identically sized, independent of label length.
       * <Link> provides automatic prefetch; onClick sets pendingKey for instant feedback.
       */}
      <div className="flex items-center rounded-full border border-border bg-card/85 px-2 py-1.5 shadow-xl shadow-foreground/10 backdrop-blur-md">
        {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
          const active = key === displayKey;
          return (
            <Link
              key={key}
              href={NAV_ROUTES[key]}
              aria-label={label}
              aria-current={key === activeKey ? 'page' : undefined}
              onClick={() => setPendingKey(key)}
              className="flex flex-1 items-center justify-center"
            >
              <span
                className={[
                  'flex flex-col items-center gap-0.5 rounded-[1.26rem] py-1.5 transition-colors',
                  active
                    ? 'bg-foreground w-14 text-background'
                    : 'px-2.5 text-muted-foreground',
                ].join(' ')}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
