'use client';

import type React from 'react';
import type { ServiceProvider } from '../_lib/calendar.types';

interface Props {
  serviceProviders: ServiceProvider[];
  selectedServiceProviderId: string;
  onSelectServiceProvider: (id: string) => void;
  appointmentCountsByServiceProviderId: Record<string, number>;
  totalAppointmentsCount: number;
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
        isActive
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'rounded-full px-1.5 text-[10px] tabular-nums',
          isActive ? 'bg-primary-foreground/20' : 'bg-muted',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

export function CalendarServiceProviderFilter({
  serviceProviders,
  selectedServiceProviderId,
  onSelectServiceProvider,
  appointmentCountsByServiceProviderId,
  totalAppointmentsCount,
}: Props) {
  return (
    <div
      className="flex gap-2 overflow-x-auto border-b border-border/30 bg-card px-5 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden"
      dir="rtl"
      style={{ msOverflowStyle: 'none' } as React.CSSProperties}
    >
      <FilterChip
        label="כל הצוות"
        count={totalAppointmentsCount}
        isActive={selectedServiceProviderId === 'all'}
        onClick={() => onSelectServiceProvider('all')}
      />
      {serviceProviders.map((sp) => (
        <FilterChip
          key={sp.id}
          label={getFirstName(sp.name)}
          count={appointmentCountsByServiceProviderId[sp.id] ?? 0}
          isActive={selectedServiceProviderId === sp.id}
          onClick={() => onSelectServiceProvider(sp.id)}
        />
      ))}
    </div>
  );
}
