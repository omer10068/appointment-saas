'use client';

import { useEffect, useRef, useState } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClosed: () => void;
  /** When true, backdrop click and Escape do not trigger close (e.g. during form submission). */
  lockClose?: boolean;
  /** Passed to aria-label on the sheet panel. */
  ariaLabel?: string;
  children: (triggerClose: () => void) => React.ReactNode;
}

/**
 * Shared bottom-sheet primitive.
 *
 * Owns the open/close animation lifecycle (visible state, isClosingRef,
 * rAF entry, 310 ms close delay) and the backdrop. Consumers render their
 * handle, header, and body via the children render-prop, which receives
 * triggerClose so they can wire close buttons and post-mutation dismissal.
 *
 * Visual design is not owned here — handle bar, header, and content layout
 * remain in each sheet component.
 */
export function BottomSheet({
  open,
  onClosed,
  lockClose = false,
  ariaLabel,
  children,
}: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);
  const panelRef     = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);

  // Open animation + focus management
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    prevFocusRef.current = document.activeElement;
    const id = requestAnimationFrame(() => {
      setVisible(true);
      panelRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape key to close (disabled when lockClose is true)
  useEffect(() => {
    if (!open || lockClose) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') triggerClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockClose]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    const target = prevFocusRef.current;
    setTimeout(() => {
      onClosed();
      if (target instanceof HTMLElement && target.isConnected) {
        target.focus({ preventScroll: true });
      }
    }, 310);
  }

  if (!open && !visible) return null;

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={lockClose ? undefined : triggerClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'max-h-[88%] flex flex-col',
          'transition-transform duration-300 ease-out',
          'outline-none',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {children(triggerClose)}
      </div>
    </div>
  );
}
