'use client';

import { Check } from 'lucide-react';
import { BottomSheet } from './primitives/bottom-sheet';
import type { ServiceProvider } from '../_lib/calendar.types';

interface Props {
  open: boolean;
  serviceProviders: ServiceProvider[];
  selectedServiceProviderId: string;
  appointmentCountsByServiceProviderId: Record<string, number>;
  totalAppointmentsCount: number;
  onSelect: (id: string) => void;
  onClosed: () => void;
}

export function CalendarProviderFilterSheet({
  open,
  serviceProviders,
  selectedServiceProviderId,
  appointmentCountsByServiceProviderId,
  totalAppointmentsCount,
  onSelect,
  onClosed,
}: Props) {
  return (
    <BottomSheet open={open} onClosed={onClosed} ariaLabel="בחירת איש צוות">
      {(triggerClose) => (
        <>
          {/* Handle + header */}
          <div className="flex shrink-0 flex-col px-5 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-extrabold text-foreground">בחירת יומן איש צוות</h2>
            </div>
          </div>

          {/* Options list */}
          <div className="flex-1 overflow-y-auto pb-8">
            <ProviderRow
              label="כל הצוות"
              count={totalAppointmentsCount}
              isSelected={selectedServiceProviderId === 'all'}
              onClick={() => { onSelect('all'); triggerClose(); }}
            />
            {serviceProviders.map((sp) => (
              <ProviderRow
                key={sp.id}
                label={sp.name}
                count={appointmentCountsByServiceProviderId[sp.id] ?? 0}
                isSelected={selectedServiceProviderId === sp.id}
                onClick={() => { onSelect(sp.id); triggerClose(); }}
              />
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

interface RowProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}

function ProviderRow({ label, count, isSelected, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-3.5 text-right transition active:bg-muted/60"
    >
      <div
        className={[
          'flex size-5 shrink-0 items-center justify-center rounded-full transition',
          isSelected ? 'bg-primary' : 'border border-border',
        ].join(' ')}
      >
        {isSelected && <Check className="size-3 text-primary-foreground" />}
      </div>
      <span className={[
        'flex-1 text-sm font-medium',
        isSelected ? 'text-foreground' : 'text-foreground/80',
      ].join(' ')}>
        {label}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
}
