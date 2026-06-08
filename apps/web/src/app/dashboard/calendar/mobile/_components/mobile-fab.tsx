'use client';

import { Plus } from 'lucide-react';

interface Props {
  onClick?: () => void;
  ariaLabel?: string;
}

export function MobileFab({ onClick, ariaLabel = 'תור חדש' }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-28 left-5 z-30 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/40 transition active:scale-[0.98]"
    >
      <Plus className="size-7" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
