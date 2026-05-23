import type { ServiceColor, AppointmentStatus } from './calendar-v2.types';

export const TIMELINE = {
  startHour: 8,
  endHour: 20,
  slotHeightPx: 80,
} as const;

export const LAYOUT = {
  bottomNavHeightPx: 64,
  fabBottomOffset: 80,
} as const;

export const SERVICE_COLORS: Record<
  ServiceColor,
  {
    bg: string;
    border: string;
    customerText: string;
    serviceText: string;
    metaText: string;
    editIcon: string;
  }
> = {
  rose: {
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    customerText: 'text-rose-950',
    serviceText: 'text-rose-800',
    metaText: 'text-rose-600',
    editIcon: 'text-rose-400',
  },
  mint: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    customerText: 'text-emerald-950',
    serviceText: 'text-emerald-800',
    metaText: 'text-emerald-600',
    editIcon: 'text-emerald-400',
  },
  peach: {
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    customerText: 'text-orange-950',
    serviceText: 'text-orange-800',
    metaText: 'text-orange-600',
    editIcon: 'text-orange-400',
  },
  lavender: {
    bg: 'bg-violet-100',
    border: 'border-violet-200',
    customerText: 'text-violet-950',
    serviceText: 'text-violet-800',
    metaText: 'text-violet-600',
    editIcon: 'text-violet-400',
  },
};

export const STATUS_STYLES: Record<
  AppointmentStatus,
  {
    label: string;
    cardOpacity: string;
    badgeBg: string;
    badgeText: string;
    nameDecoration: string;
  }
> = {
  scheduled: {
    label: '',
    cardOpacity: '',
    badgeBg: '',
    badgeText: '',
    nameDecoration: '',
  },
  completed: {
    label: 'הושלם',
    cardOpacity: 'opacity-70',
    badgeBg: 'bg-gray-200',
    badgeText: 'text-gray-600',
    nameDecoration: '',
  },
  cancelled: {
    label: 'בוטל',
    cardOpacity: 'opacity-50',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    nameDecoration: 'line-through',
  },
  no_show: {
    label: 'לא הגיע',
    cardOpacity: 'opacity-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    nameDecoration: '',
  },
};
