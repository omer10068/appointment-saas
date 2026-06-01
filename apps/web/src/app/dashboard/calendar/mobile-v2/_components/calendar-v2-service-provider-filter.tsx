'use client';

import type React from 'react';
import type { ServiceProvider } from '../_lib/calendar-v2.types';

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

interface FilterPillProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterPill({ label, count, isActive, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-0.5 min-w-13 py-2.5 rounded-xl transition-all duration-150 border',
        isActive
          ? 'bg-[#2d2d3a] text-white border-[#2d2d3a] shadow-sm'
          : 'bg-transparent text-gray-700 border-gray-200',
      ].join(' ')}
    >
      <span className="text-[12px] font-normal leading-tight text-center">{label}</span>
      <span
        className={[
          'text-[10px] leading-none',
          isActive ? 'text-white/70' : 'text-gray-400',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

export function CalendarV2ServiceProviderFilter({
  serviceProviders,
  selectedServiceProviderId,
  onSelectServiceProvider,
  appointmentCountsByServiceProviderId,
  totalAppointmentsCount,
}: Props) {
  return (
    <div
      className="bg-gray-50 dark:bg-gray-950 px-3 py-2 border-b border-gray-100 dark:border-gray-800"
      dir="rtl"
    >
      <div
        className="overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <div className="flex justify-center gap-2 min-w-full">
          <FilterPill
            label="כל הצוות"
            count={totalAppointmentsCount}
            isActive={selectedServiceProviderId === 'all'}
            onClick={() => onSelectServiceProvider('all')}
          />
          {serviceProviders.map((sp) => (
            <FilterPill
              key={sp.id}
              label={getFirstName(sp.name)}
              count={appointmentCountsByServiceProviderId[sp.id] ?? 0}
              isActive={selectedServiceProviderId === sp.id}
              onClick={() => onSelectServiceProvider(sp.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
