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

export const GRID = {
  hourLineColor: '#E8E8E8',
  halfHourLineColor: '#EFEFEF',
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
    customerText: 'text-[#4A1F2C]',
    serviceText: 'text-[#7A3D50]',
    metaText: 'text-[#9B5B6F]',
    editIcon: 'text-[#B6788C]',
  },

  mint: {
    bg: 'bg-[#E8F5E9]',
    bar: 'bg-[#4CAF50]/36',
    border: 'border-[#c8e6c9]',
    customerText: 'text-[#1F3D2A]',
    serviceText: 'text-[#3D6B4C]',
    metaText: 'text-[#5F8A69]',
    editIcon: 'text-[#7CAA84]',
  },

  cream: {
    bg: 'bg-[#FFF8E1]',
    bar: 'bg-[#C49020]/36',
    border: 'border-[#ffecb3]',
    customerText: 'text-[#4A3715]',
    serviceText: 'text-[#7A5A1F]',
    metaText: 'text-[#9A7730]',
    editIcon: 'text-[#B89342]',
  },

  lavender: {
    bg: 'bg-[#F6ECF8]',
    bar: 'bg-[#AB47BC]/28',
    border: 'border-[#e7d3ec]',
    customerText: 'text-[#3B2345]',
    serviceText: 'text-[#5E3D69]',
    metaText: 'text-[#7B5A85]',
    editIcon: 'text-[#9B7CA3]',
  },

  sky: {
    bg: 'bg-[#E3F2FD]',
    bar: 'bg-[#42A5F5]/36',
    border: 'border-[#bbdefb]',
    customerText: 'text-[#16384F]',
    serviceText: 'text-[#2C5C7A]',
    metaText: 'text-[#4C7E9E]',
    editIcon: 'text-[#6FA3C7]',
  },
};
