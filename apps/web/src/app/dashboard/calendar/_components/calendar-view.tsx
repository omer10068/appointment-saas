"use client";

import { useState, useEffect, useMemo, type ElementType, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  XCircle,
  UserX,
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no-show";
type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  customerName: string;
  serviceName: string;
  staffMember: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  status: AppointmentStatus;
  date: Date;
}

interface StaffMember {
  id: string;
  name: string;
  avatar: string;
}

// ─── Local utility ─────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const STAFF: StaffMember[] = [
  { id: "1", name: "Sarah Chen",       avatar: "SC" },
  { id: "2", name: "Marcus Johnson",   avatar: "MJ" },
  { id: "3", name: "Emily Rodriguez",  avatar: "ER" },
  { id: "4", name: "David Kim",        avatar: "DK" },
];

const SERVICES = [
  "Business Consultation", "Strategy Session", "Project Review",
  "Onboarding Call", "Follow-up Meeting", "Demo Presentation", "Training Session",
];

const CUSTOMERS = [
  "Acme Corp", "TechStart Inc", "GlobalFin Ltd", "Innovate Co",
  "DataFlow Systems", "CloudNine Solutions", "Vertex Analytics",
];

const STATUS_POOL: AppointmentStatus[] = [
  "scheduled", "scheduled", "scheduled", "completed", "cancelled", "no-show",
];

function generateMockAppointments(weekStart: Date): Appointment[] {
  const result: Appointment[] = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + day);
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) {
      const startHour = Math.floor(Math.random() * 10) + 8;
      const startMin = Math.random() > 0.5 ? 0 : 30;
      const duration = ([30, 60, 90] as const)[Math.floor(Math.random() * 3)];
      const totalEnd = startHour * 60 + startMin + duration;
      const endHour = Math.floor(totalEnd / 60);
      const endMin = totalEnd % 60;
      if (endHour > 20) continue;
      result.push({
        id: `${day}-${i}`,
        customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
        serviceName:  SERVICES[Math.floor(Math.random() * SERVICES.length)],
        staffMember:  STAFF[Math.floor(Math.random() * STAFF.length)].name,
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
        endTime:   `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
        status: STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)],
        date: new Date(date),
      });
    }
  }
  return result;
}

// ─── Date utilities ────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateRange(date: Date, mode: ViewMode): string {
  if (mode === "day") {
    return date.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric", year: "numeric",
    });
  }
  if (mode === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const end = new Date(date);
  end.setDate(date.getDate() + 6);
  const s = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badgeCls: string; cardCls: string }
> = {
  scheduled: {
    label: "Scheduled",
    badgeCls: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    cardCls:  "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 dark:hover:bg-blue-500/15",
  },
  completed: {
    label: "Completed",
    badgeCls: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    cardCls:  "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:hover:bg-emerald-500/15",
  },
  cancelled: {
    label: "Cancelled",
    badgeCls: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    cardCls:  "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/15",
  },
  "no-show": {
    label: "No-show",
    badgeCls: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    cardCls:  "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/15",
  },
};

const STATUS_ICONS: Record<AppointmentStatus, ElementType> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  "no-show":  UserX,
};

// ─── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({
  title, value, icon: Icon, trend,
}: {
  title: string;
  value: number;
  icon: ElementType;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm py-2 sm:py-4">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {trend && (
            <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 truncate hidden sm:block">
              {trend}
            </p>
          )}
        </div>
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  );
}

// ─── AppointmentCard ───────────────────────────────────────────────────────────

function AppointmentCard({
  appointment, compact = false, weekView = false, mobile = false,
}: {
  appointment: Appointment;
  compact?: boolean;
  weekView?: boolean;
  mobile?: boolean;
}) {
  const cfg = STATUS_CONFIG[appointment.status];

  if (compact) {
    return (
      <div className={cn("p-3 rounded-lg border transition-all cursor-pointer", cfg.cardCls)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
              {appointment.customerName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {appointment.serviceName}
            </p>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {appointment.startTime} – {appointment.endTime}
          </span>
        </div>
      </div>
    );
  }

  if (weekView) {
    return (
      <div className={cn("p-2 rounded-md border transition-all cursor-pointer group", cfg.cardCls)}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {appointment.startTime}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">–</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {appointment.endTime}
            </span>
          </div>
          <p className="font-medium text-xs leading-tight line-clamp-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {appointment.customerName}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight line-clamp-1">
            {appointment.serviceName}
          </p>
        </div>
      </div>
    );
  }

  if (mobile) {
    return (
      <div className={cn("p-3 rounded-lg border transition-all cursor-pointer active:scale-[0.98]", cfg.cardCls)}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-center min-w-[48px]">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {appointment.startTime}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{appointment.endTime}</p>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                {appointment.customerName}
              </p>
              <span className={cn(
                "inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-medium flex-shrink-0",
                cfg.badgeCls,
              )}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {appointment.serviceName}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{appointment.staffMember}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-3 rounded-lg border transition-all cursor-pointer group", cfg.cardCls)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {appointment.startTime} – {appointment.endTime}
          </span>
          <span className={cn(
            "inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-medium",
            cfg.badgeCls,
          )}>
            {cfg.label}
          </span>
        </div>
        <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {appointment.customerName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appointment.serviceName}</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <User className="h-3 w-3" />
          <span className="truncate">{appointment.staffMember}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CalendarSkeleton ──────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-9 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-9 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-4">
            <div className="h-4 w-12 mb-2 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-8 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-4 space-y-2">
              <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-16 w-full rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EmptyDayState ─────────────────────────────────────────────────────────────

function EmptyDayState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-xs text-gray-400 dark:text-gray-500">No appointments</p>
    </div>
  );
}

// ─── ErrorState ────────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
        Failed to load calendar
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        There was an error loading your appointments.
      </p>
      <button
        onClick={onRetry}
        className="h-8 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ─── DayView ───────────────────────────────────────────────────────────────────

function DayView({
  appointments, selectedDate, today,
}: {
  appointments: Appointment[];
  selectedDate: Date;
  today: Date;
}) {
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8–20
  const HOUR_HEIGHT = 80;
  const START_HOUR = 8;
  const isToday = isSameDay(selectedDate, today);
  const dayAppts = appointments.filter((a) => isSameDay(a.date, selectedDate));

  function getStyle(apt: Appointment) {
    const [sh, sm] = apt.startTime.split(":").map(Number);
    const [eh, em] = apt.endTime.split(":").map(Number);
    const top = ((sh - START_HOUR) + sm / 60) * HOUR_HEIGHT;
    const height = Math.max(((eh - START_HOUR) + em / 60) * HOUR_HEIGHT - top - 4, 32);
    return { top, height };
  }

  function getDuration(apt: Appointment) {
    const [sh, sm] = apt.startTime.split(":").map(Number);
    const [eh, em] = apt.endTime.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function buildGroups(apts: Appointment[]): Appointment[][] {
    const sorted = [...apts].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const groups: Appointment[][] = [];
    let current: Appointment[] = [];
    for (const apt of sorted) {
      if (current.length === 0) {
        current.push(apt);
      } else {
        const overlaps = current.some(
          (g) => apt.startTime < g.endTime && apt.endTime > g.startTime,
        );
        if (overlaps) {
          current.push(apt);
        } else {
          groups.push([...current]);
          current = [apt];
        }
      }
    }
    if (current.length) groups.push(current);
    return groups;
  }

  const groups = buildGroups(dayAppts);

  return (
    <div className="hidden lg:block">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {/* Day header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-lg flex flex-col items-center justify-center",
              isToday
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            )}>
              <span className="text-xs font-medium uppercase">
                {selectedDate.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="text-lg font-bold">{selectedDate.getDate()}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dayAppts.length} appointment{dayAppts.length !== 1 ? "s" : ""} scheduled
              </p>
            </div>
            {isToday && (
              <span className="ml-auto inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                Today
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} className="flex" style={{ height: HOUR_HEIGHT }}>
              <div className="w-20 p-3 text-sm text-gray-500 dark:text-gray-400 border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 flex-shrink-0">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="flex-1 border-b border-gray-200 dark:border-gray-700" />
            </div>
          ))}

          {/* Appointments overlay */}
          <div className="absolute top-0 left-20 right-0 bottom-0 px-1">
            {groups.flatMap((group) =>
              group.map((apt) => {
                const style = getStyle(apt);
                const cfg = STATUS_CONFIG[apt.status];
                const isCompact = getDuration(apt) < 45;
                const idx = group.findIndex((a) => a.id === apt.id);
                const pct = 100 / group.length;
                const hasOverlap = group.length > 1;
                const StatusIcon = STATUS_ICONS[apt.status];

                if (isCompact) {
                  return (
                    <div
                      key={apt.id}
                      className={cn(
                        "absolute rounded-md border transition-all cursor-pointer overflow-hidden group",
                        cfg.cardCls,
                      )}
                      style={{
                        top: style.top,
                        height: style.height,
                        left: hasOverlap ? `calc(${idx * pct}% + 4px)` : "4px",
                        width: hasOverlap ? `calc(${pct}% - 8px)` : "calc(100% - 8px)",
                      }}
                    >
                      <div className="h-full flex items-center px-2 py-1 gap-2">
                        <StatusIcon className={cn(
                          "h-3 w-3 flex-shrink-0",
                          apt.status === "scheduled"  && "text-blue-500",
                          apt.status === "completed"  && "text-emerald-500",
                          apt.status === "cancelled"  && "text-red-500",
                          apt.status === "no-show"    && "text-amber-500",
                        )} />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {apt.startTime} – {apt.endTime}
                        </span>
                        <span className="font-medium text-xs truncate flex-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {apt.customerName}
                        </span>
                        {style.height >= 40 && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px] hidden xl:inline">
                            {apt.staffMember.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "absolute rounded-lg border transition-all cursor-pointer overflow-hidden group",
                      cfg.cardCls,
                    )}
                    style={{
                      top: style.top,
                      height: style.height,
                      left: hasOverlap ? `calc(${idx * pct}% + 4px)` : "4px",
                      width: hasOverlap ? `calc(${pct}% - 8px)` : "calc(100% - 8px)",
                    }}
                  >
                    <div className="h-full flex flex-col p-2 overflow-hidden">
                      <div className="flex items-center justify-between gap-1 flex-shrink-0">
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {apt.startTime} – {apt.endTime}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded border text-[9px] px-1 py-0 h-4 flex-shrink-0",
                          cfg.badgeCls,
                        )}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate mt-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {apt.customerName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {apt.serviceName}
                      </p>
                      {style.height >= 80 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-auto">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{apt.staffMember}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MonthView ─────────────────────────────────────────────────────────────────

function MonthView({
  appointments, selectedDate, today, onDayClick,
}: {
  appointments: Appointment[];
  selectedDate: Date;
  today: Date;
  onDayClick: (date: Date) => void;
}) {
  const ms = getMonthStart(selectedDate);
  const year = ms.getFullYear();
  const month = ms.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells: { date: Date; current: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), current: false });
  }

  return (
    <div className="hidden lg:block">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="p-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, current }, idx) => {
            const isToday = isSameDay(date, today);
            const dayAppts = appointments.filter((a) => isSameDay(a.date, date));
            return (
              <button
                key={idx}
                onClick={() => onDayClick(date)}
                className={cn(
                  "p-2 min-h-[100px] border-b border-r border-gray-200 dark:border-gray-700 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
                  !current && "bg-gray-50/50 dark:bg-gray-800/20",
                  isToday && "bg-blue-50/50 dark:bg-blue-950/20",
                )}
              >
                <div className="flex flex-col h-full">
                  <span className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    !current && "text-gray-400 dark:text-gray-600",
                    isToday  && "bg-blue-600 text-white",
                    current && !isToday && "text-gray-900 dark:text-gray-100",
                  )}>
                    {date.getDate()}
                  </span>
                  {current && dayAppts.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayAppts.length <= 3 ? (
                        dayAppts.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            className={cn("text-xs px-1.5 py-0.5 rounded truncate", STATUS_CONFIG[apt.status].cardCls)}
                          >
                            {apt.startTime} {apt.customerName}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-600" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {dayAppts.length} appointments
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MobileAgendaView ──────────────────────────────────────────────────────────

function MobileAgendaView({
  appointments, weekStart, today, viewMode, selectedDate,
}: {
  appointments: Appointment[];
  weekStart: Date;
  today: Date;
  viewMode: ViewMode;
  selectedDate: Date;
}) {
  let days: Date[] = [];
  if (viewMode === "day") {
    days = [selectedDate];
  } else if (viewMode === "week") {
    days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  } else {
    const ms = getMonthStart(selectedDate);
    const daysInMonth = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate();
    days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(ms);
      d.setDate(i + 1);
      return d;
    });
  }

  return (
    <div className="space-y-3 lg:hidden">
      {days.map((date, idx) => {
        const dayAppts = appointments
          .filter((a) => isSameDay(a.date, date))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = isSameDay(date, today);
        return (
          <div key={idx}>
            <div className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg mb-2 sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur",
              isToday && "bg-blue-50/95 dark:bg-blue-950/20",
            )}>
              <div className={cn(
                "h-9 w-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0",
                isToday
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
              )}>
                <span className="text-[10px] font-medium uppercase leading-none">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-sm font-bold leading-none mt-0.5">{date.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium text-gray-900 dark:text-gray-100",
                  isToday && "text-blue-600 dark:text-blue-400",
                )}>
                  {date.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dayAppts.length} appointment{dayAppts.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isToday && (
                <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300">
                  Today
                </span>
              )}
            </div>
            <div className="space-y-2 pl-1">
              {dayAppts.length > 0 ? (
                dayAppts.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} mobile />
                ))
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-3 px-2 text-center bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                  No appointments scheduled
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WeeklyCalendarGrid ────────────────────────────────────────────────────────

function WeeklyCalendarGrid({
  appointments, weekStart, today,
}: {
  appointments: Appointment[];
  weekStart: Date;
  today: Date;
}) {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm">
        {days.map((date, idx) => {
          const dayAppts = appointments
            .filter((a) => isSameDay(a.date, date))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = isSameDay(date, today);
          return (
            <div
              key={idx}
              className={cn(
                "bg-white dark:bg-gray-900 min-h-[400px] flex flex-col",
                isToday && "bg-blue-50/50 dark:bg-blue-950/10",
              )}
            >
              <div className={cn(
                "p-3 border-b border-gray-200 dark:border-gray-700 text-center",
                isToday && "bg-blue-50 dark:bg-blue-950/20",
              )}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {DAY_NAMES[idx]}
                </p>
                <p className={cn(
                  "text-xl font-semibold mt-1",
                  isToday
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-gray-100",
                )}>
                  {date.getDate()}
                </p>
              </div>
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {dayAppts.length > 0 ? (
                  dayAppts.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} weekView />
                  ))
                ) : (
                  <EmptyDayState />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MobileFiltersPanel ────────────────────────────────────────────────────────

function MobileFiltersPanel({
  show, staffMembers, selectedStaff, setSelectedStaff, selectedStatus, setSelectedStatus,
}: {
  show: boolean;
  staffMembers: StaffMember[];
  selectedStaff: string | null;
  setSelectedStaff: (id: string | null) => void;
  selectedStatus: AppointmentStatus | null;
  setSelectedStatus: (s: AppointmentStatus | null) => void;
}) {
  if (!show) return null;

  const statuses: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no-show"];
  const activeFilters = (selectedStaff ? 1 : 0) + (selectedStatus ? 1 : 0);

  return (
    <div className="xl:hidden border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          Filters
        </span>
        {activeFilters > 0 && (
          <button
            onClick={() => { setSelectedStaff(null); setSelectedStatus(null); }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Staff */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Staff
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStaff(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              selectedStaff === null
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
          >
            All Staff
          </button>
          {staffMembers.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStaff(selectedStaff === s.id ? null : s.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedStaff === s.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              selectedStatus === null
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
          >
            All Statuses
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedStatus === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              {STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarCard({
  title, icon: Icon, children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          {title}
        </h3>
      </div>
      <div className="px-4 pb-4 space-y-1">{children}</div>
    </div>
  );
}

function SidebarFilterBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
      )}
    >
      {children}
    </button>
  );
}

function Sidebar({
  appointments, staffMembers, selectedStaff, setSelectedStaff,
  selectedStatus, setSelectedStatus, today,
}: {
  appointments: Appointment[];
  staffMembers: StaffMember[];
  selectedStaff: string | null;
  setSelectedStaff: (id: string | null) => void;
  selectedStatus: AppointmentStatus | null;
  setSelectedStatus: (s: AppointmentStatus | null) => void;
  today: Date;
}) {
  const upcoming = appointments
    .filter((a) => {
      if (a.status !== "scheduled") return false;
      if (a.date < today && !isSameDay(a.date, today)) return false;
      if (selectedStaff) {
        const s = staffMembers.find((m) => m.id === selectedStaff);
        if (s && a.staffMember !== s.name) return false;
      }
      return true;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime))
    .slice(0, 3);

  const statuses: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no-show"];

  return (
    <div className="space-y-4">
      <SidebarCard title="Upcoming" icon={Clock}>
        {upcoming.length > 0 ? (
          upcoming.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} compact />
          ))
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No upcoming appointments
          </p>
        )}
      </SidebarCard>

      <SidebarCard title="Staff" icon={User}>
        <SidebarFilterBtn active={selectedStaff === null} onClick={() => setSelectedStaff(null)}>
          All Staff
        </SidebarFilterBtn>
        {staffMembers.map((s) => (
          <SidebarFilterBtn
            key={s.id}
            active={selectedStaff === s.id}
            onClick={() => setSelectedStaff(selectedStaff === s.id ? null : s.id)}
          >
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium flex-shrink-0">
                {s.avatar}
              </span>
              <span className="truncate">{s.name}</span>
            </span>
          </SidebarFilterBtn>
        ))}
      </SidebarCard>

      <SidebarCard title="Status" icon={Filter}>
        <SidebarFilterBtn active={selectedStatus === null} onClick={() => setSelectedStatus(null)}>
          All Statuses
        </SidebarFilterBtn>
        {statuses.map((status) => (
          <SidebarFilterBtn
            key={status}
            active={selectedStatus === status}
            onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
          >
            {STATUS_CONFIG[status].label}
          </SidebarFilterBtn>
        ))}
      </SidebarCard>
    </div>
  );
}

// ─── CalendarView (main export) ────────────────────────────────────────────────

export function CalendarView() {
  const [isLoading,         setIsLoading]         = useState(true);
  const [hasError,          setHasError]           = useState(false);
  const [currentWeek,       setCurrentWeek]        = useState(() => getWeekStart(new Date()));
  const [selectedDate,      setSelectedDate]       = useState(() => new Date());
  const [viewMode,          setViewMode]           = useState<ViewMode>("week");
  const [appointments,      setAppointments]       = useState<Appointment[]>([]);
  const [selectedStaff,     setSelectedStaff]      = useState<string | null>(null);
  const [selectedStatus,    setSelectedStatus]     = useState<AppointmentStatus | null>(null);
  const [showMobileFilters, setShowMobileFilters]  = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const timer = setTimeout(() => {
      try {
        const dataStart = viewMode === "month" ? getMonthStart(selectedDate) : currentWeek;
        const data = generateMockAppointments(dataStart);
        if (viewMode === "month") {
          for (let w = 1; w < 5; w++) {
            const ws = new Date(dataStart);
            ws.setDate(dataStart.getDate() + w * 7);
            data.push(...generateMockAppointments(ws));
          }
        }
        setAppointments(data);
        setIsLoading(false);
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [currentWeek, viewMode, selectedDate]);

  const filtered = useMemo(() => appointments.filter((a) => {
    if (selectedStaff) {
      const s = STAFF.find((m) => m.id === selectedStaff);
      if (s && a.staffMember !== s.name) return false;
    }
    if (selectedStatus && a.status !== selectedStatus) return false;
    return true;
  }), [appointments, selectedStaff, selectedStatus]);

  const stats = useMemo(() => ({
    today:     appointments.filter((a) => isSameDay(a.date, today)).length,
    thisWeek:  appointments.filter((a) => getWeekStart(a.date).getTime() === currentWeek.getTime()).length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  }), [appointments, today, currentWeek]);

  function goToToday() {
    const now = new Date();
    setCurrentWeek(getWeekStart(now));
    setSelectedDate(now);
  }

  function goToPrevious() {
    if (viewMode === "day") {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d);
      setCurrentWeek(getWeekStart(d));
    } else if (viewMode === "week") {
      const d = new Date(currentWeek);
      d.setDate(d.getDate() - 7);
      setCurrentWeek(d);
    } else {
      const d = new Date(selectedDate);
      d.setMonth(d.getMonth() - 1);
      setSelectedDate(d);
      setCurrentWeek(getWeekStart(d));
    }
  }

  function goToNext() {
    if (viewMode === "day") {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d);
      setCurrentWeek(getWeekStart(d));
    } else if (viewMode === "week") {
      const d = new Date(currentWeek);
      d.setDate(d.getDate() + 7);
      setCurrentWeek(d);
    } else {
      const d = new Date(selectedDate);
      d.setMonth(d.getMonth() + 1);
      setSelectedDate(d);
      setCurrentWeek(getWeekStart(d));
    }
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setCurrentWeek(getWeekStart(date));
    setViewMode("day");
  }

  function handleRetry() {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setAppointments(generateMockAppointments(currentWeek));
      setIsLoading(false);
    }, 800);
  }

  const displayDate = viewMode === "week" ? currentWeek : selectedDate;
  const activeFilters = (selectedStaff ? 1 : 0) + (selectedStatus ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Internal header — will be replaced by DashboardPageHeader when wired to page.tsx */}
      <header className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Calendar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage appointments and view your schedule at a glance.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <SummaryCard title="Today"     value={stats.today}     icon={CalendarIcon} trend="+2 from yesterday" />
        <SummaryCard title="This Week" value={stats.thisWeek}  icon={CalendarDays} />
        <SummaryCard title="Completed" value={stats.completed} icon={CheckCircle2} />
        <SummaryCard title="Cancelled" value={stats.cancelled} icon={XCircle} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToToday}
            className="h-8 px-2 sm:px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPrevious}
            aria-label="Previous"
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNext}
            aria-label="Next"
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px] sm:max-w-none">
            {formatDateRange(displayDate, viewMode)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5 sm:p-1">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "capitalize text-xs px-2 sm:px-3 h-7 rounded-md transition-colors",
                  viewMode === mode
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Mobile filters toggle */}
          <button
            onClick={() => setShowMobileFilters((v) => !v)}
            className={cn(
              "xl:hidden h-8 px-2 sm:px-3 text-sm rounded-md border transition-colors flex items-center gap-1.5",
              showMobileFilters
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-medium">
                {activeFilters}
              </span>
            )}
          </button>

          {/* New appointment */}
          <button className="h-8 px-3 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Mobile filters panel (inline, not Sheet) */}
      <MobileFiltersPanel
        show={showMobileFilters}
        staffMembers={STAFF}
        selectedStaff={selectedStaff}
        setSelectedStaff={setSelectedStaff}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* Main layout: calendar + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div>
          {hasError ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
              <ErrorState onRetry={handleRetry} />
            </div>
          ) : isLoading ? (
            <CalendarSkeleton />
          ) : (
            <>
              {viewMode === "week" && (
                <WeeklyCalendarGrid
                  appointments={filtered}
                  weekStart={currentWeek}
                  today={today}
                />
              )}
              {viewMode === "day" && (
                <DayView
                  appointments={filtered}
                  selectedDate={selectedDate}
                  today={today}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  appointments={filtered}
                  selectedDate={selectedDate}
                  today={today}
                  onDayClick={handleDayClick}
                />
              )}
              <MobileAgendaView
                appointments={filtered}
                weekStart={currentWeek}
                today={today}
                viewMode={viewMode}
                selectedDate={selectedDate}
              />
            </>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden xl:block">
          <Sidebar
            appointments={appointments}
            staffMembers={STAFF}
            selectedStaff={selectedStaff}
            setSelectedStaff={setSelectedStaff}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            today={today}
          />
        </div>
      </div>
    </div>
  );
}
