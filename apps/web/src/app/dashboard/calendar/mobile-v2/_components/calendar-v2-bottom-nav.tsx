'use client';

import { Home, Calendar, Users, Scissors, MoreHorizontal } from 'lucide-react';
import { LAYOUT } from '../_lib/calendar-v2.design';

// Ordered right-to-left for RTL flex: first item renders rightmost
const NAV_ITEMS = [
  { icon: Home,           label: 'בית',     key: 'home' },
  { icon: Calendar,       label: 'לוח שנה', key: 'calendar' },
  { icon: Users,          label: 'לקוחות',  key: 'customers' },
  { icon: Scissors,       label: 'שירותים', key: 'services' },
  { icon: MoreHorizontal, label: 'עוד',      key: 'more' },
] as const;

interface Props {
  activeKey?: string;
}

export function CalendarV2BottomNav({ activeKey = 'calendar' }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      style={{ height: LAYOUT.bottomNavHeightPx }}
    >
      <div className="flex items-center justify-around h-full px-1">
        {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              aria-label={label}
              className={[
                'flex flex-col items-center justify-center gap-0.5',
                'min-w-13 h-full px-1 rounded-xl transition-colors',
                active ? 'text-[#2d2d3a]' : 'text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
