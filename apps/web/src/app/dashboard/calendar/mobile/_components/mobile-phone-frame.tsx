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
 * On desktop (md+): a natural-size phone frame (v0 dimensions) rendered as a
 * normal in-flow element inside the scrollable desktop stage (in layout.tsx).
 *
 * `md:[transform:translateZ(0)]` is visually a no-op but creates a CSS
 * containing block, so all fixed descendants (FAB, bottom nav, sheets) are
 * scoped to the phone frame on desktop — no changes needed in those components.
 */
export function MobilePhoneFrame({ children, dir, className }: Props) {
  return (
    <div
      dir={dir}
      className={[
        // Mobile: full-screen app shell
        'fixed inset-0 z-50 flex flex-col overflow-hidden bg-background',
        // Desktop: natural-size phone frame inside the scrollable stage.
        // `relative inset-auto z-auto` removes the fixed/viewport behavior.
        // `[transform:translateZ(0)]` creates a containing block for fixed children.
        'md:relative md:inset-auto md:z-auto',
        'md:h-215 md:w-100',
        'md:transform-[translateZ(0)]',
        'md:rounded-[2.75rem]',
        'md:border-10 md:border-foreground/90',
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
