'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  /** Called after the close animation completes — parent should set open=false here. */
  onClosed: () => void;
}

export function CalendarCreateSheet({ open, onClosed }: Props) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  // Open animation: mount with visible=false, transition in on next frame.
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // All close paths go through here — animates out before notifying parent.
  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310); // 10 ms buffer over the 300 ms CSS transition
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0',
          'bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[16px] font-semibold text-gray-800 dark:text-gray-100">
            תור חדש
          </span>
          <button
            onClick={triggerClose}
            aria-label="סגור"
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form area — Phase B onwards */}
        <div className="pb-8" />
      </div>
    </div>
  );
}
