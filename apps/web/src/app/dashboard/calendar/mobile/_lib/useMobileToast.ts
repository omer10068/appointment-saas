'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MobileToast {
  message: string | null;
  showToast: (message: string, durationMs?: number) => void;
}

/**
 * Lightweight per-shell toast hook. Each shell owns its own state;
 * no context/provider needed.
 *
 * Usage:
 *   const { message, showToast } = useMobileToast();
 *   <MobileToast message={message} />
 */
export function useMobileToast(): MobileToast {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, durationMs = 3500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { message, showToast };
}
