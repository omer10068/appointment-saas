'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building2, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Building2, label: 'עסקים', key: 'businesses' as const },
  { icon: Settings,  label: 'מערכת',  key: 'settings'   as const },
] as const;

const NAV_ROUTES: Record<'businesses' | 'settings', string> = {
  businesses: '/admin/businesses',
  settings:   '/admin/settings',
};

interface Props {
  activeKey?: 'businesses' | 'settings';
}

export function AdminBottomNav({ activeKey = 'businesses' }: Props) {
  const pathname = usePathname();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  const displayKey = pendingKey ?? activeKey;

  return (
    <nav className="fixed inset-x-4 bottom-(--safe-bottom) z-40">
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
                <span
                  className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}
                >
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
