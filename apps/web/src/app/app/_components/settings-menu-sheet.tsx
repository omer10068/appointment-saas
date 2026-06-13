'use client';

import { useRouter } from 'next/navigation';
import { CalendarOff, ChevronLeft, Clock, Users } from 'lucide-react';
import { BottomSheet } from './primitives/bottom-sheet';

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

  function handleItemTap(route: string | null, triggerClose: () => void) {
    if (!route) return;
    triggerClose();
    router.push(route);
  }

  return (
    <BottomSheet open={open} onClosed={onClosed} ariaLabel="ניהול והגדרות">
      {(triggerClose) => (
        <>
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
                  onClick={() => handleItemTap(route, triggerClose)}
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
        </>
      )}
    </BottomSheet>
  );
}
