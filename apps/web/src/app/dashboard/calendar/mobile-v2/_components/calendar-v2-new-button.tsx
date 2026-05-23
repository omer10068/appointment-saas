'use client';

import { Plus } from 'lucide-react';
import { LAYOUT } from '../_lib/calendar-v2.design';

interface Props {
  onClick?: () => void;
}

export function CalendarV2NewButton({ onClick }: Props) {
  return (
    <div
      className="fixed left-4 right-4 z-40"
      style={{ bottom: LAYOUT.fabBottomOffset }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-semibold text-[15px] py-3.5 rounded-full shadow-md transition-colors"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>פגישה חדשה</span>
      </button>
    </div>
  );
}
