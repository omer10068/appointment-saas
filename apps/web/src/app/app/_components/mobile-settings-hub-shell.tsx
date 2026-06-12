'use client';

import { useRouter } from 'next/navigation';
import { CalendarOff, ChevronLeft, Clock, Settings, UserCog, Users } from 'lucide-react';
import { MobilePhoneFrame } from './mobile-phone-frame';
import { CalendarBottomNav } from './calendar-bottom-nav';

// ─── Items ────────────────────────────────────────────────────────────────────

const ITEMS = [
  {
    icon: Clock,
    label: 'שעות פעילות העסק',
    sub: 'ימי ושעות פתיחה שבועיות',
    route: '/app/settings/business-hours',
  },
  {
    icon: CalendarOff,
    label: 'חריגות וחופשות',
    sub: 'חגים, חופשות וסגירות חד-פעמיות',
    route: '/app/settings/exceptions',
  },
  {
    icon: Users,
    label: 'שעות צוות',
    sub: 'שעות עבודה לכל נותן שירות',
    route: '/app/settings/provider-hours',
  },
  {
    icon: UserCog,
    label: 'אנשי צוות',
    sub: 'ניהול נותני שירות והרשאות צוות',
    route: '/app/settings/team',
  },
] as const;

// ─── Shell ────────────────────────────────────────────────────────────────────

export function MobileSettingsHubShell() {
  const router = useRouter();

  return (
    <MobilePhoneFrame dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none px-5 pb-3 pt-9">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            ניהול והגדרות
          </h1>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/10">
            <Settings className="size-5" />
          </div>
        </div>
      </header>

      {/* ── Settings items ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-2">
        <div className="space-y-3">
          {ITEMS.map(({ icon: Icon, label, sub, route }) => (
            <button
              key={route}
              onClick={() => router.push(route)}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-right transition active:bg-muted/60"
            >
              {/* Icon badge — physical right in RTL (first child) */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>

              {/* Label + subtitle */}
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {label}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">{sub}</span>
              </div>

              {/* Chevron — physical left in RTL (last child) */}
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Settings hub — no main-nav tab is active */}
      <CalendarBottomNav activeKey="settings" />
    </MobilePhoneFrame>
  );
}
