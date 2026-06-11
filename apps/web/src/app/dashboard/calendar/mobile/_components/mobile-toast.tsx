'use client';

import { Check } from 'lucide-react';

interface Props {
  message: string | null;
}

/**
 * Floating success toast that lives above sheets (z-[70]).
 * On mobile: fixed relative to the viewport (which = the phone shell).
 * On desktop: scoped to the phone frame via the frame's transform containing block.
 *
 * Pair with `useMobileToast()` — each shell renders one of these.
 */
export function MobileToast({ message }: Props) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-[70] flex items-center gap-2.5 rounded-2xl bg-foreground px-4 py-3 shadow-lg shadow-foreground/20"
    >
      <Check
        size={16}
        strokeWidth={2.5}
        className="shrink-0 text-primary"
        aria-hidden="true"
      />
      <span className="text-[13px] font-semibold text-background">{message}</span>
    </div>
  );
}
