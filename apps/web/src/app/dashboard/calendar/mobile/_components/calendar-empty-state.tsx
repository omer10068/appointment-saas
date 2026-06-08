import { CalendarX } from 'lucide-react';

export function CalendarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <CalendarX size={48} className="text-muted-foreground/40 mb-4" />
      <p className="text-base font-medium text-muted-foreground text-center">אין פגישות היום</p>
      <p className="text-sm text-muted-foreground/60 text-center mt-1">לחץ + כדי להוסיף פגישה חדשה</p>
    </div>
  );
}
