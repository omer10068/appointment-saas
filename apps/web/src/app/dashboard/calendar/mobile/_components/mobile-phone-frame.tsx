'use client';

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  dir?: string;
  /** Optional extra classes (e.g. a bg override). Appended to the frame div. */
  className?: string;
}

/**
 * On mobile (< md): full-screen fixed shell — no visible frame.
 * On desktop (md+): centered iPhone-style phone frame matching the v0 reference.
 *
 * The md: transform creates a containing block for fixed descendants
 * (FAB, bottom nav, sheets), so those components need no changes.
 */
export function MobilePhoneFrame({ children, dir, className }: Props) {
  return (
    <div
      dir={dir}
      className={[
        // Mobile: full-screen app shell
        'fixed inset-0 z-50 flex flex-col overflow-hidden bg-background',
        // Desktop: phone frame — dimensions, border, radius, shadow, centering
        'md:inset-auto md:top-1/2 md:left-1/2',
        'md:-translate-x-1/2 md:-translate-y-1/2',
        'md:h-[860px] md:w-[400px]',
        'md:rounded-[2.75rem]',
        'md:border-[10px] md:border-foreground/90',
        'md:shadow-2xl md:shadow-foreground/30',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
