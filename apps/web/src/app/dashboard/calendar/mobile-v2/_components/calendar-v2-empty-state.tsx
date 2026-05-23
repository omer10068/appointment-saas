import { CalendarX } from 'lucide-react';

export function CalendarV2EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <CalendarX size={48} className="text-gray-300 mb-4" />
      <p className="text-base font-medium text-gray-500 text-center">אין פגישות היום</p>
      <p className="text-sm text-gray-400 text-center mt-1">לחץ + כדי להוסיף פגישה חדשה</p>
    </div>
  );
}
