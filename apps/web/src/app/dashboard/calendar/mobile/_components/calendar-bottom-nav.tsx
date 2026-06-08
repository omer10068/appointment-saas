'use client';

import { useRouter } from 'next/navigation';
import { Home, Calendar, Users, Scissors, UserCog } from 'lucide-react';

// Ordered right-to-left for RTL flex: first item renders rightmost.
const NAV_ITEMS = [
  { icon: Home,     label: 'בית',     key: 'home'      },
  { icon: Calendar, label: 'יומן',    key: 'calendar'  },
  { icon: Users,    label: 'לקוחות',  key: 'customers' },
  { icon: Scissors, label: 'שירותים', key: 'services'  },
  { icon: UserCog,  label: 'צוות',    key: 'team'      },
] as const;

const NAV_ROUTES: Partial<Record<string, string>> = {
  home:      '/mobile/home',
  calendar:  '/mobile/calendar',
  customers: '/mobile/customers',
  services:  '/mobile/services',
  team:      '/mobile/team',
};

interface Props {
  activeKey?: string;
}

export function CalendarBottomNav({ activeKey = 'calendar' }: Props) {
  const router = useRouter();

  function handleNavTap(key: string) {
    const route = NAV_ROUTES[key];
    if (route) router.push(route);
  }

  return (
    <nav className="fixed inset-x-4 bottom-5 z-40">
      <div className="flex items-center justify-between rounded-full border border-gray-200 bg-white/85 px-2 py-1.5 shadow-xl shadow-[#1a2035]/10 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/85">
        {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavTap(key)}
              className={[
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors',
                active
                  ? 'bg-[#1a2035] px-4 text-white'
                  : 'px-2.5 text-gray-400 dark:text-gray-500',
              ].join(' ')}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
