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
    bar: string;
    border: string;
    customerText: string;
    serviceText: string;
    metaText: string;
    editIcon: string;
  }
> = {
  rose: {
    bg: 'bg-[#FCE4EC]',
    bar: 'bg-[#EC407A]/36',
    border: 'border-[#f8bbd0]',
    customerText: 'text-rose-900',
    serviceText: 'text-rose-700',
    metaText: 'text-rose-500',
    editIcon: 'text-rose-400',
  },
  mint: {
    bg: 'bg-[#E8F5E9]',
    bar: 'bg-[#4CAF50]/36',
    border: 'border-[#c8e6c9]',
    customerText: 'text-emerald-900',
    serviceText: 'text-emerald-700',
    metaText: 'text-emerald-500',
    editIcon: 'text-emerald-400',
  },
  cream: {
    bg: 'bg-[#FFF8E1]',
    bar: 'bg-[#C49020]/36',
    border: 'border-[#ffecb3]',
    customerText: 'text-amber-900',
    serviceText: 'text-amber-700',
    metaText: 'text-amber-500',
    editIcon: 'text-amber-400',
  },
  lavender: {
    bg: 'bg-[#F3E5F5]',
    bar: 'bg-[#AB47BC]/36',
    border: 'border-[#e1bee7]',
    customerText: 'text-purple-900',
    serviceText: 'text-purple-700',
    metaText: 'text-purple-500',
    editIcon: 'text-purple-400',
  },
  sky: {
    bg: 'bg-[#E3F2FD]',
    bar: 'bg-[#42A5F5]/36',
    border: 'border-[#bbdefb]',
    customerText: 'text-sky-900',
    serviceText: 'text-sky-700',
    metaText: 'text-sky-500',
    editIcon: 'text-sky-400',
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
