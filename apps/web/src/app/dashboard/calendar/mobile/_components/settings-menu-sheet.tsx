'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarOff, ChevronLeft, Clock, Users } from 'lucide-react';

// ─── Menu items ───────────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  route: string | null; // null = coming soon
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: Clock,
    label: 'שעות פעילות העסק',
    sub: 'ימי ושעות פתיחה שבועיות',
    route: '/settings/business-hours',
  },
  {
    icon: CalendarOff,
    label: 'חריגות וחופשות',
    sub: 'חגים, חופשות וסגירות חד-פעמיות',
    route: '/settings/exceptions',
  },
  {
    icon: Users,
    label: 'שעות צוות',
    sub: 'שעות עבודה לכל נותן שירות',
    route: '/settings/provider-hours',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClosed: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsMenuSheet({ open, onClosed }: Props) {
  const router = useRouter();
  const [visible, setVisible]   = useState(false);
  const isClosingRef            = useRef(false);

  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function triggerClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(onClosed, 310);
  }

  function handleItemTap(route: string | null) {
    if (!route) return;
    // Start closing animation, then navigate; both happen immediately
    triggerClose();
    router.push(route);
  }

  if (!open && !visible) return null;

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet — auto height, no max-h scroll needed for 3 items */}
      <div
        className={[
          'absolute bottom-0 left-0 right-0 flex flex-col',
          'bg-card rounded-t-4xl border-t border-border shadow-2xl shadow-foreground/30',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Handle + title */}
        <div className="flex shrink-0 flex-col px-5 pt-3 pb-4">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <h2 className="text-lg font-extrabold text-foreground">ניהול והגדרות</h2>
        </div>

        {/* Menu items */}
        <div className="space-y-2 px-4 pb-10">
          {MENU_ITEMS.map(({ icon: Icon, label, sub, route }) => {
            const active = !!route;
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleItemTap(route)}
                disabled={!active}
                className={[
                  'flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right transition',
                  active
                    ? 'cursor-pointer border-border bg-card active:bg-muted/60'
                    : 'cursor-default border-border/50 bg-muted/30 opacity-50',
                ].join(' ')}
              >
                {/* Icon badge — physical right in RTL (first flex child) */}
                <div
                  className={[
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  <Icon className="size-5" />
                </div>

                {/* Label + subtitle */}
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span
                    className={[
                      'text-sm font-semibold leading-tight',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{sub}</span>
                </div>

                {/* Chevron or "בקרוב" — physical left in RTL (last flex child) */}
                {active ? (
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    בקרוב
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
