'use client';

import { useState } from 'react';
import { Home, Calendar, Users, Scissors, MoreHorizontal } from 'lucide-react';
import { LAYOUT } from '../_lib/calendar.design';

// Ordered right-to-left for RTL flex: first item renders rightmost.
// `implemented` marks items that actually navigate; others show a "coming soon" hint.
const NAV_ITEMS = [
  { icon: Home,           label: 'בית',     key: 'home',      implemented: false },
  { icon: Calendar,       label: 'לוח שנה', key: 'calendar',  implemented: true  },
  { icon: Users,          label: 'לקוחות',  key: 'customers', implemented: false },
  { icon: Scissors,       label: 'שירותים', key: 'services',  implemented: false },
  { icon: MoreHorizontal, label: 'עוד',      key: 'more',      implemented: false },
] as const;

interface Props {
  activeKey?: string;
}

export function CalendarBottomNav({ activeKey = 'calendar' }: Props) {
  const [showingSoon, setShowingSoon] = useState(false);

  function handleUnimplementedTap() {
    setShowingSoon(true);
    setTimeout(() => setShowingSoon(false), 2000);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      style={{ height: LAYOUT.bottomNavHeightPx }}
    >
      {/* "בקרוב" pill — floats just above the nav when an unimplemented item is tapped */}
      {showingSoon && (
        <div className="absolute bottom-full left-0 right-0 flex justify-center pb-2 pointer-events-none">
          <span className="bg-gray-800/85 text-white text-[12px] font-medium px-3 py-1 rounded-full">
            בקרוב
          </span>
        </div>
      )}

      <div className="flex items-center justify-around h-full px-1">
        {NAV_ITEMS.map(({ icon: Icon, label, key, implemented }) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              aria-label={label}
              onClick={implemented ? undefined : handleUnimplementedTap}
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
