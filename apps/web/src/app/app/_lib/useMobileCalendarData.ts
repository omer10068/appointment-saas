'use client';
// Canonical implementation moved to _hooks. This re-export keeps existing
// shell imports (mobile-calendar-shell.tsx) pointing at the correct module
// without requiring a rename.
export type { MobileCalendarData } from '../_hooks/useMobileCalendarData';
export { useMobileCalendarData } from '../_hooks/useMobileCalendarData';
