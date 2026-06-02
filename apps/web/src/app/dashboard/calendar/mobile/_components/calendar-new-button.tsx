'use client';

import { Plus } from 'lucide-react';
import { LAYOUT } from '../_lib/calendar.design';

interface Props {
  onClick?: () => void;
}

export function CalendarNewButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="תור חדש"
      className="fixed left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2d2d3a] text-white shadow-lg transition-transform active:scale-95"
      style={{ bottom: LAYOUT.fabBottomOffset }}
    >
      <Plus size={22} strokeWidth={2.5} />
    </button>
  );
}
