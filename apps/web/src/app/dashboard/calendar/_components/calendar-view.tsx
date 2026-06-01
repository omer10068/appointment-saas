"use client";

import { useState, useEffect, useMemo, useRef, type ElementType, type ReactNode } from "react";
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

// ─── Public types ───────────────────────────────────────────────────────────────

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no-show";
type ViewMode = "day" | "week" | "month";

export type CalendarAppointment = {
  id:           string;
  customerName: string;
  serviceName:  string;
  staffMember:  string;
  startTime:    string; // "HH:mm" local time
  endTime:      string; // "HH:mm" local time
  status:       AppointmentStatus;
  date:         Date;   // local-midnight
};

export type CalendarLabels = {
  today:                   string;
  thisWeek:                string;
  day:                     string;
  week:                    string;
  month:                   string;
  newAppointment:          string;
  filters:                 string;
  upcoming:                string;
  staff:                   string;
  status:                  string;
  allStaff:                string;
  allStatuses:             string;
  clearAll:                string;
  noAppointments:          string;
  noAppointmentsScheduled: string;
  noUpcomingAppointments:  string;
  failedToLoadCalendar:    string;
  loadErrorDescription:    string;
  tryAgain:                string;
  appointment:             string;
  appointments:            string;
  scheduledText:           string;
  statuses: {
    scheduled: string;
    completed: string;
    cancelled: string;
    noShow:    string;
  };
};

export type CalendarViewProps = {
  appointments?:  CalendarAppointment[];
  isLoading?:     boolean;
  error?:         string | null;
  onRetry?:       () => void;
  onRangeChange?: (from: Date, to: Date) => void;
  showHeader?:    boolean;
  locale?:        string;
  dir?:           "ltr" | "rtl";
  labels?:        Partial<CalendarLabels>;
};

// Private alias
type Appointment = CalendarAppointment;

interface StaffMember { id: string; name: string; avatar: string; }

// ─── Default labels ─────────────────────────────────────────────────────────────

const DEFAULT_LABELS_EN: CalendarLabels = {
  today:                   "Today",
  thisWeek:                "This Week",
  day:                     "Day",
  week:                    "Week",
  month:                   "Month",
  newAppointment:          "New Appointment",
  filters:                 "Filters",
  upcoming:                "Upcoming",
  staff:                   "Staff",
  status:                  "Status",
  allStaff:                "All Staff",
  allStatuses:             "All Statuses",
  clearAll:                "Clear all",
  noAppointments:          "No appointments",
  noAppointmentsScheduled: "No appointments scheduled",
  noUpcomingAppointments:  "No upcoming appointments",
  failedToLoadCalendar:    "Failed to load calendar",
  loadErrorDescription:    "There was an error loading your appointments.",
  tryAgain:                "Try again",
  appointment:             "appointment",
  appointments:            "appointments",
  scheduledText:           "scheduled",
  statuses: {
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    noShow:    "No-show",
  },
};

const DEFAULT_LABELS_HE: CalendarLabels = {
  today:                   "היום",
  thisWeek:                "השבוע",
  day:                     "יום",
  week:                    "שבוע",
  month:                   "חודש",
  newAppointment:          "פגישה חדשה",
  filters:                 "סינון",
  upcoming:                "קרוב",
  staff:                   "צוות",
  status:                  "סטטוס",
  allStaff:                "כל הצוות",
  allStatuses:             "כל הסטטוסים",
  clearAll:                "נקה הכל",
  noAppointments:          "אין פגישות",
  noAppointmentsScheduled: "אין פגישות מתוכננות",
  noUpcomingAppointments:  "אין פגישות קרובות",
  failedToLoadCalendar:    "טעינת היומן נכשלה",
  loadErrorDescription:    "אירעה שגיאה בטעינת הפגישות.",
  tryAgain:                "נסה שוב",
  appointment:             "פגישה",
  appointments:            "פגישות",
  scheduledText:           "מתוכנן",
  statuses: {
    scheduled: "מתוכנן",
    completed: "הושלם",
    cancelled: "בוטל",
    noShow:    "לא הגיע",
  },
};

// ─── Local utilities ────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

function getStatusLabel(status: AppointmentStatus, L: CalendarLabels): string {
  switch (status) {
    case "scheduled": return L.statuses.scheduled;
    case "completed": return L.statuses.completed;
    case "cancelled": return L.statuses.cancelled;
    case "no-show":   return L.statuses.noShow;
  }
}

// ─── TimeRange ─────────────────────────────────────────────────────────────────
// Wraps start–end in an LTR-isolated span so the separator never reverses in RTL.

function TimeRange({ start, end, className }: { start: string; end: string; className?: string }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate" }} className={className}>
      {start} – {end}
    </span>
  );
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const STAFF: StaffMember[] = [
  { id: "1", name: "Sarah Chen",      avatar: "SC" },
  { id: "2", name: "Marcus Johnson",  avatar: "MJ" },
  { id: "3", name: "Emily Rodriguez", avatar: "ER" },
  { id: "4", name: "David Kim",       avatar: "DK" },
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
      const startMin  = Math.random() > 0.5 ? 0 : 30;
      const duration  = ([30, 60, 90] as const)[Math.floor(Math.random() * 3)];
      const totalEnd  = startHour * 60 + startMin + duration;
      const endHour   = Math.floor(totalEnd / 60);
      const endMin    = totalEnd % 60;
      if (endHour > 20) continue;
      result.push({
        id:           `${day}-${i}`,
        customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
        serviceName:  SERVICES[Math.floor(Math.random() * SERVICES.length)],
        staffMember:  STAFF[Math.floor(Math.random() * STAFF.length)].name,
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
        endTime:   `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
        status: STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)],
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
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
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function formatDateRange(date: Date, mode: ViewMode, locale = "en-US"): string {
  if (mode === "day") {
    return date.toLocaleDateString(locale, {
      weekday: "long", month: "short", day: "numeric", year: "numeric",
    });
  }
  if (mode === "month") {
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  const end = new Date(date);
  end.setDate(date.getDate() + 6);
  const s = date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  const e = end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

// Known Sunday for locale-aware day-name generation
const SUNDAY_REF = new Date(2024, 0, 7);

function getLocaleDayNames(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(SUNDAY_REF);
    d.setDate(SUNDAY_REF.getDate() + i);
    return d.toLocaleDateString(locale, { weekday: "short" });
  });
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { badgeCls: string; cardCls: string; chipCls: string }
> = {
  scheduled: {
    badgeCls: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    cardCls:  "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-500/30 dark:hover:bg-blue-950/60",
    chipCls:  "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/60 dark:border-blue-700/60 dark:text-blue-100",
  },
  completed: {
    badgeCls: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    cardCls:  "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:hover:bg-emerald-950/60",
    chipCls:  "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/60 dark:border-emerald-700/60 dark:text-emerald-100",
  },
  cancelled: {
    badgeCls: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    cardCls:  "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-500/30 dark:hover:bg-red-950/60",
    chipCls:  "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/60 dark:border-red-700/60 dark:text-red-100",
  },
  "no-show": {
    badgeCls: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    cardCls:  "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-500/30 dark:hover:bg-amber-950/60",
    chipCls:  "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/60 dark:border-amber-700/60 dark:text-amber-100",
  },
};

const STATUS_ICONS: Record<AppointmentStatus, ElementType> = {
  scheduled:  Clock,
  completed:  CheckCircle2,
  cancelled:  XCircle,
  "no-show":  UserX,
};

// ─── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({ title, value, icon: Icon }: {
  title: string; value: number; icon: ElementType;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm py-2 sm:py-4">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {value}
          </p>
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
  appointment, compact = false, weekView = false, mobile = false, statusLabel,
}: {
  appointment: Appointment;
  compact?:    boolean;
  weekView?:   boolean;
  mobile?:     boolean;
  statusLabel: string;
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
          <TimeRange
            start={appointment.startTime}
            end={appointment.endTime}
            className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0"
          />
        </div>
      </div>
    );
  }

  if (weekView) {
    return (
      <div className={cn("p-2 rounded-md border transition-all cursor-pointer group", cfg.cardCls)}>
        <div className="space-y-0.5">
          <TimeRange
            start={appointment.startTime}
            end={appointment.endTime}
            className="text-[10px] font-medium text-gray-500 dark:text-gray-400"
          />
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
          <div className="flex-shrink-0 text-center min-w-[48px]" dir="ltr">
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
                {statusLabel}
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

  // Full card (default)
  return (
    <div className={cn("p-3 rounded-lg border transition-all cursor-pointer group", cfg.cardCls)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <TimeRange
            start={appointment.startTime}
            end={appointment.endTime}
            className="text-xs font-medium text-gray-500 dark:text-gray-400"
          />
          <span className={cn(
            "inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-medium",
            cfg.badgeCls,
          )}>
            {statusLabel}
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

function EmptyDayState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}

// ─── ErrorState ────────────────────────────────────────────────────────────────

function ErrorState({
  title, description, retryLabel, onRetry,
}: {
  title: string; description: string; retryLabel: string; onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <button
        onClick={onRetry}
        className="h-8 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {retryLabel}
      </button>
    </div>
  );
}

// ─── DayView ───────────────────────────────────────────────────────────────────
// Timeline is forced dir="ltr" so absolute-position math stays correct in RTL layouts.
// Appointment content restores the page's dir for text rendering.

function DayView({
  appointments, selectedDate, today, locale = "en-US", dir, L,
}: {
  appointments: Appointment[];
  selectedDate: Date;
  today:        Date;
  locale?:      string;
  dir?:         "ltr" | "rtl";
  L:            CalendarLabels;
}) {
  const HOUR_HEIGHT = 80;
  const isToday   = isSameDay(selectedDate, today);
  const dayAppts  = appointments.filter((a) => isSameDay(a.date, selectedDate));

  // Compute visible hour range dynamically so out-of-hours appointments are never clipped.
  const DEFAULT_START = 8;
  const DEFAULT_END   = 20;
  const startHour = dayAppts.length > 0
    ? Math.min(DEFAULT_START, Math.min(...dayAppts.map((a) => parseInt(a.startTime.split(":")[0], 10))))
    : DEFAULT_START;
  const endHour = dayAppts.length > 0
    ? Math.max(DEFAULT_END, Math.max(...dayAppts.map((a) => {
        const [h, m] = a.endTime.split(":").map(Number);
        return m > 0 ? h + 1 : h;
      })))
    : DEFAULT_END;
  const HOURS      = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);
  const START_HOUR = startHour;

  function getStyle(apt: Appointment) {
    const [sh, sm] = apt.startTime.split(":").map(Number);
    const [eh, em] = apt.endTime.split(":").map(Number);
    const top    = ((sh - START_HOUR) + sm / 60) * HOUR_HEIGHT;
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
        {/* Day header — follows page direction */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0",
              isToday
                ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            )}>
              <span className="text-xs font-medium uppercase">
                {selectedDate.toLocaleDateString(locale, { weekday: "short" })}
              </span>
              <span className="text-lg font-bold">{selectedDate.getDate()}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedDate.toLocaleDateString(locale, { weekday: "long" })}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dayAppts.length} {dayAppts.length === 1 ? L.appointment : L.appointments} {L.scheduledText}
              </p>
            </div>
            {isToday && (
              <span className="ms-auto inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                {L.today}
              </span>
            )}
          </div>
        </div>

        {/* Timeline — forced LTR so left/right positioning math is always correct */}
        <div className="relative" dir="ltr">
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
                const style       = getStyle(apt);
                const cfg         = STATUS_CONFIG[apt.status];
                const isCompact   = getDuration(apt) < 45;
                const idx         = group.findIndex((a) => a.id === apt.id);
                const pct         = 100 / group.length;
                const hasOverlap  = group.length > 1;
                const StatusIcon  = STATUS_ICONS[apt.status];

                if (isCompact) {
                  return (
                    <div
                      key={apt.id}
                      className={cn(
                        "absolute rounded-md border transition-all cursor-pointer overflow-hidden group",
                        cfg.cardCls,
                      )}
                      style={{
                        top:    style.top,
                        height: style.height,
                        left:   hasOverlap ? `calc(${idx * pct}% + 4px)` : "4px",
                        width:  hasOverlap ? `calc(${pct}% - 8px)` : "calc(100% - 8px)",
                      }}
                    >
                      {/* Restore page dir for text content */}
                      <div className="h-full flex items-center px-2 py-1 gap-2" dir={dir}>
                        <StatusIcon className={cn(
                          "h-3 w-3 flex-shrink-0",
                          apt.status === "scheduled" && "text-blue-500",
                          apt.status === "completed" && "text-emerald-500",
                          apt.status === "cancelled" && "text-red-500",
                          apt.status === "no-show"   && "text-amber-500",
                        )} />
                        <TimeRange
                          start={apt.startTime}
                          end={apt.endTime}
                          className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0"
                        />
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
                      top:    style.top,
                      height: style.height,
                      left:   hasOverlap ? `calc(${idx * pct}% + 4px)` : "4px",
                      width:  hasOverlap ? `calc(${pct}% - 8px)` : "calc(100% - 8px)",
                    }}
                  >
                    {/* Restore page dir for text content */}
                    <div className="h-full flex flex-col p-2 overflow-hidden" dir={dir}>
                      <div className="flex items-center justify-between gap-1 flex-shrink-0">
                        <TimeRange
                          start={apt.startTime}
                          end={apt.endTime}
                          className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                        />
                        <span className={cn(
                          "inline-flex items-center rounded border text-[9px] px-1 py-0 h-4 flex-shrink-0",
                          cfg.badgeCls,
                        )}>
                          {getStatusLabel(apt.status, L)}
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
  appointments, selectedDate, today, onDayClick, locale = "en-US", L,
}: {
  appointments: Appointment[];
  selectedDate: Date;
  today:        Date;
  onDayClick:   (date: Date) => void;
  locale?:      string;
  L:            CalendarLabels;
}) {
  const ms          = getMonthStart(selectedDate);
  const year        = ms.getFullYear();
  const month       = ms.getMonth();
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const DAY_HEADERS = getLocaleDayNames(locale);

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
          {DAY_HEADERS.map((d) => (
            <div key={d} className="p-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, current }, idx) => {
            const isToday   = isSameDay(date, today);
            const dayAppts  = appointments.filter((a) => isSameDay(a.date, date));
            return (
              <button
                key={idx}
                onClick={() => onDayClick(date)}
                className={cn(
                  "p-2 min-h-[100px] border-b border-r border-gray-200 dark:border-gray-700 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
                  !current && "bg-gray-50/50 dark:bg-gray-800/20",
                  isToday  && "bg-blue-50/50 dark:bg-blue-950/20",
                )}
              >
                <div className="flex flex-col h-full">
                  <span className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    !current             && "text-gray-400 dark:text-gray-600",
                    isToday              && "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white",
                    current && !isToday  && "text-gray-900 dark:text-gray-100",
                  )}>
                    {date.getDate()}
                  </span>
                  {current && dayAppts.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayAppts.length <= 3 ? (
                        dayAppts.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded border truncate",
                              STATUS_CONFIG[apt.status].chipCls,
                            )}
                          >
                            <TimeRange
                              start={apt.startTime}
                              end={apt.endTime}
                              className="me-1"
                            />
                            <span className="truncate">{apt.customerName}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)]" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {dayAppts.length} {L.appointments}
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
  appointments, weekStart, today, viewMode, selectedDate, locale = "en-US", L,
}: {
  appointments: Appointment[];
  weekStart:    Date;
  today:        Date;
  viewMode:     ViewMode;
  selectedDate: Date;
  locale?:      string;
  L:            CalendarLabels;
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
    const ms          = getMonthStart(selectedDate);
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
                  ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
              )}>
                <span className="text-[10px] font-medium uppercase leading-none">
                  {date.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                <span className="text-sm font-bold leading-none mt-0.5">{date.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium text-gray-900 dark:text-gray-100",
                  isToday && "text-blue-600 dark:text-blue-400",
                )}>
                  {date.toLocaleDateString(locale, { weekday: "long" })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dayAppts.length} {dayAppts.length === 1 ? L.appointment : L.appointments}
                </p>
              </div>
              {isToday && (
                <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300">
                  {L.today}
                </span>
              )}
            </div>
            <div className="space-y-2 ps-1">
              {dayAppts.length > 0 ? (
                dayAppts.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    mobile
                    statusLabel={getStatusLabel(apt.status, L)}
                  />
                ))
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-3 px-2 text-center bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                  {L.noAppointmentsScheduled}
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
  appointments, weekStart, today, locale = "en-US", L,
}: {
  appointments: Appointment[];
  weekStart:    Date;
  today:        Date;
  locale?:      string;
  L:            CalendarLabels;
}) {
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
                  {date.toLocaleDateString(locale, { weekday: "short" })}
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
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      weekView
                      statusLabel={getStatusLabel(apt.status, L)}
                    />
                  ))
                ) : (
                  <EmptyDayState label={L.noAppointments} />
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
  show, staffMembers, selectedStaff, setSelectedStaff, selectedStatus, setSelectedStatus, L,
}: {
  show:             boolean;
  staffMembers:     StaffMember[];
  selectedStaff:    string | null;
  setSelectedStaff: (id: string | null) => void;
  selectedStatus:   AppointmentStatus | null;
  setSelectedStatus:(s: AppointmentStatus | null) => void;
  L:                CalendarLabels;
}) {
  if (!show) return null;

  const statuses: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no-show"];
  const activeFilters = (selectedStaff ? 1 : 0) + (selectedStatus ? 1 : 0);

  return (
    <div className="xl:hidden border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          {L.filters}
        </span>
        {activeFilters > 0 && (
          <button
            onClick={() => { setSelectedStaff(null); setSelectedStatus(null); }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {L.clearAll}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {L.staff}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStaff(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              selectedStaff === null
                ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
          >
            {L.allStaff}
          </button>
          {staffMembers.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStaff(selectedStaff === s.id ? null : s.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedStaff === s.id
                  ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{L.status}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              selectedStatus === null
                ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
          >
            {L.allStatuses}
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedStatus === status
                  ? "bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              {getStatusLabel(status, L)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarCard({ title, icon: Icon, children }: {
  title: string; icon: ElementType; children: ReactNode;
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

function SidebarFilterBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-start px-3 py-1.5 rounded-lg text-sm transition-colors",
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
  selectedStatus, setSelectedStatus, today, L,
}: {
  appointments:     Appointment[];
  staffMembers:     StaffMember[];
  selectedStaff:    string | null;
  setSelectedStaff: (id: string | null) => void;
  selectedStatus:   AppointmentStatus | null;
  setSelectedStatus:(s: AppointmentStatus | null) => void;
  today:            Date;
  L:                CalendarLabels;
}) {
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Upcoming: scheduled appointments from the already-filtered list, on or after today
  const upcoming = appointments
    .filter((a) => {
      if (a.status !== "scheduled") return false;
      const aptMidnight = new Date(a.date.getFullYear(), a.date.getMonth(), a.date.getDate());
      return aptMidnight >= todayMidnight;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime))
    .slice(0, 3);

  const statuses: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no-show"];

  return (
    <div className="space-y-4">
      <SidebarCard title={L.upcoming} icon={Clock}>
        {upcoming.length > 0 ? (
          upcoming.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              compact
              statusLabel={getStatusLabel(apt.status, L)}
            />
          ))
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            {L.noUpcomingAppointments}
          </p>
        )}
      </SidebarCard>

      <SidebarCard title={L.staff} icon={User}>
        <SidebarFilterBtn active={selectedStaff === null} onClick={() => setSelectedStaff(null)}>
          {L.allStaff}
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

      <SidebarCard title={L.status} icon={Filter}>
        <SidebarFilterBtn active={selectedStatus === null} onClick={() => setSelectedStatus(null)}>
          {L.allStatuses}
        </SidebarFilterBtn>
        {statuses.map((status) => (
          <SidebarFilterBtn
            key={status}
            active={selectedStatus === status}
            onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
          >
            {getStatusLabel(status, L)}
          </SidebarFilterBtn>
        ))}
      </SidebarCard>
    </div>
  );
}

// ─── CalendarView (main export) ────────────────────────────────────────────────

export function CalendarView({
  appointments: externalAppointments,
  isLoading:    externalLoading,
  error:        externalError,
  onRetry,
  onRangeChange,
  showHeader = true,
  locale     = "en-US",
  dir,
  labels,
}: CalendarViewProps = {}) {
  // Stable at mount — determines data source for the component's lifetime
  const isExternalMode = useRef(externalAppointments !== undefined).current;

  // Internal state (mock mode only)
  const [mockLoading,      setMockLoading]      = useState(!isExternalMode);
  const [mockError,        setMockError]        = useState<string | null>(null);
  const [mockAppointments, setMockAppointments] = useState<Appointment[]>([]);
  const [mockRetryKey,     setMockRetryKey]     = useState(0);

  // UI state
  const [currentWeek,       setCurrentWeek]       = useState(() => getWeekStart(new Date()));
  const [selectedDate,      setSelectedDate]      = useState(() => new Date());
  const [viewMode,          setViewMode]          = useState<ViewMode>("week");
  const [selectedStaff,     setSelectedStaff]     = useState<string | null>(null);
  const [selectedStatus,    setSelectedStatus]    = useState<AppointmentStatus | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Resolved labels — base defaults from locale, merged with any caller overrides
  const L = useMemo((): CalendarLabels => {
    const base = locale.startsWith("he") ? DEFAULT_LABELS_HE : DEFAULT_LABELS_EN;
    return {
      ...base,
      ...labels,
      statuses: { ...base.statuses, ...labels?.statuses },
    } as CalendarLabels;
  }, [locale, labels]);

  // RTL-aware nav icons: arrow direction mirrors semantics (previous = back, next = forward)
  const PreviousIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon     = dir === "rtl" ? ChevronLeft  : ChevronRight;

  // Mock data — only when no external appointments are provided
  useEffect(() => {
    if (isExternalMode) return;
    setMockLoading(true);
    setMockError(null);
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
        setMockAppointments(data);
        setMockLoading(false);
      } catch {
        setMockError("Failed to generate mock data");
        setMockLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [isExternalMode, currentWeek, viewMode, selectedDate, mockRetryKey]);

  // Range change notification — tells parent which dates to fetch
  useEffect(() => {
    if (!onRangeChange) return;
    let from: Date, to: Date;
    if (viewMode === "day") {
      from = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      to   = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
    } else if (viewMode === "week") {
      from = new Date(currentWeek);
      to   = new Date(currentWeek);
      to.setDate(currentWeek.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else {
      const ms = getMonthStart(selectedDate);
      from = new Date(ms);
      to   = new Date(ms.getFullYear(), ms.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    onRangeChange(from, to);
  }, [viewMode, currentWeek, selectedDate, onRangeChange]);

  // Effective data
  const appointments = useMemo(
    () => isExternalMode ? (externalAppointments ?? []) : mockAppointments,
    [isExternalMode, externalAppointments, mockAppointments],
  );
  const isLoading = isExternalMode ? (externalLoading ?? false) : mockLoading;
  const hasError  = isExternalMode ? !!externalError            : !!mockError;

  // Derive staff list from real appointments in external mode; use mock STAFF otherwise
  const effectiveStaffMembers = useMemo((): StaffMember[] => {
    if (!isExternalMode) return STAFF;
    const seen    = new Set<string>();
    const members: StaffMember[] = [];
    for (const apt of appointments) {
      if (!apt.staffMember || seen.has(apt.staffMember)) continue;
      seen.add(apt.staffMember);
      const words   = apt.staffMember.trim().split(/\s+/);
      const initials = words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : apt.staffMember.slice(0, 2).toUpperCase();
      members.push({ id: apt.staffMember, name: apt.staffMember, avatar: initials });
    }
    return members;
  }, [isExternalMode, appointments]);

  // Reset staff selection when the selected staff no longer exists in the current data
  useEffect(() => {
    if (selectedStaff !== null && !effectiveStaffMembers.some((m) => m.id === selectedStaff)) {
      setSelectedStaff(null);
    }
  }, [selectedStaff, effectiveStaffMembers]);

  function handleRetry() {
    if (isExternalMode) { onRetry?.(); }
    else { setMockError(null); setMockRetryKey((k) => k + 1); }
  }

  const filtered = useMemo(() => appointments.filter((a) => {
    if (selectedStaff) {
      const s = effectiveStaffMembers.find((m) => m.id === selectedStaff);
      if (s && a.staffMember !== s.name) return false;
    }
    if (selectedStatus && a.status !== selectedStatus) return false;
    return true;
  }), [appointments, selectedStaff, selectedStatus, effectiveStaffMembers]);

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

  const displayDate   = viewMode === "week" ? currentWeek : selectedDate;
  const activeFilters = (selectedStaff ? 1 : 0) + (selectedStatus ? 1 : 0);

  const VIEW_MODES: { mode: ViewMode; label: string }[] = [
    { mode: "day",   label: L.day   },
    { mode: "week",  label: L.week  },
    { mode: "month", label: L.month },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      {showHeader && (
        <header className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Calendar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage appointments and view your schedule at a glance.
          </p>
        </header>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <SummaryCard title={L.today}                  value={stats.today}     icon={CalendarIcon} />
        <SummaryCard title={L.thisWeek}               value={stats.thisWeek}  icon={CalendarDays} />
        <SummaryCard title={L.statuses.completed}     value={stats.completed} icon={CheckCircle2} />
        <SummaryCard title={L.statuses.cancelled}     value={stats.cancelled} icon={XCircle} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToToday}
            className="h-8 px-2 sm:px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {L.today}
          </button>
          <button
            onClick={goToPrevious}
            aria-label="Previous"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <PreviousIcon className="h-4 w-4" />
          </button>
          <button
            onClick={goToNext}
            aria-label="Next"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <NextIcon className="h-4 w-4" />
          </button>
          <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px] sm:max-w-none">
            {formatDateRange(displayDate, viewMode, locale)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5 sm:p-1">
            {VIEW_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "text-xs px-2 sm:px-3 h-7 rounded-md transition-colors",
                  viewMode === mode
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                )}
              >
                {label}
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
            <span className="hidden sm:inline">{L.filters}</span>
            {activeFilters > 0 && (
              <span className="h-4 w-4 rounded-full bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white text-[10px] flex items-center justify-center font-medium">
                {activeFilters}
              </span>
            )}
          </button>

          {/* New appointment */}
          <button className="h-8 px-3 text-sm rounded-md bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] text-white hover:bg-[linear-gradient(145deg,#8BB8FF_0%,#5B98FA_45%,#3F85DE_100%)] transition-colors flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>{L.newAppointment}</span>
          </button>
        </div>
      </div>

      {/* Inline mobile filters — no Sheet, no Drawer, no Radix */}
      <MobileFiltersPanel
        show={showMobileFilters}
        staffMembers={effectiveStaffMembers}
        selectedStaff={selectedStaff}
        setSelectedStaff={setSelectedStaff}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        L={L}
      />

      {/* Main layout: calendar + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div>
          {hasError ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
              <ErrorState
                title={L.failedToLoadCalendar}
                description={L.loadErrorDescription}
                retryLabel={L.tryAgain}
                onRetry={handleRetry}
              />
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
                  locale={locale}
                  L={L}
                />
              )}
              {viewMode === "day" && (
                <DayView
                  appointments={filtered}
                  selectedDate={selectedDate}
                  today={today}
                  locale={locale}
                  dir={dir}
                  L={L}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  appointments={filtered}
                  selectedDate={selectedDate}
                  today={today}
                  onDayClick={handleDayClick}
                  locale={locale}
                  L={L}
                />
              )}
              <MobileAgendaView
                appointments={filtered}
                weekStart={currentWeek}
                today={today}
                viewMode={viewMode}
                selectedDate={selectedDate}
                locale={locale}
                L={L}
              />
            </>
          )}
        </div>

        {/* Desktop sidebar — receives filtered appointments for the Upcoming section */}
        <div className="hidden xl:block">
          <Sidebar
            appointments={filtered}
            staffMembers={effectiveStaffMembers}
            selectedStaff={selectedStaff}
            setSelectedStaff={setSelectedStaff}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            today={today}
            L={L}
          />
        </div>
      </div>
    </div>
  );
}
