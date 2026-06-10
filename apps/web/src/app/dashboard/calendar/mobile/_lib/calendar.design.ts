import type { ServiceColor } from './calendar.types';

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
    bg: 'bg-rose-50',
    bar: 'bg-rose-400',
    border: 'border-rose-200',
    customerText: 'text-rose-950',
    serviceText: 'text-rose-700',
    metaText: 'text-rose-500',
    editIcon: 'text-rose-400',
  },

  mint: {
    bg: 'bg-emerald-50',
    bar: 'bg-emerald-400',
    border: 'border-emerald-200',
    customerText: 'text-emerald-950',
    serviceText: 'text-emerald-700',
    metaText: 'text-emerald-500',
    editIcon: 'text-emerald-400',
  },

  cream: {
    bg: 'bg-amber-50',
    bar: 'bg-amber-400',
    border: 'border-amber-200',
    customerText: 'text-amber-950',
    serviceText: 'text-amber-700',
    metaText: 'text-amber-500',
    editIcon: 'text-amber-400',
  },

  lavender: {
    bg: 'bg-purple-50',
    bar: 'bg-purple-400',
    border: 'border-purple-200',
    customerText: 'text-purple-950',
    serviceText: 'text-purple-700',
    metaText: 'text-purple-500',
    editIcon: 'text-purple-400',
  },

  sky: {
    bg: 'bg-sky-50',
    bar: 'bg-sky-400',
    border: 'border-sky-200',
    customerText: 'text-sky-950',
    serviceText: 'text-sky-700',
    metaText: 'text-sky-500',
    editIcon: 'text-sky-400',
  },
};
