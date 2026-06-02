import type { Appointment, Service, ServiceProvider, Customer } from './calendar.types';

const SERVICES: Service[] = [
  { id: 's1', name: 'תספורת', durationMinutes: 45, color: 'rose' },
  { id: 's2', name: 'צביעה', durationMinutes: 90, color: 'mint' },
  { id: 's3', name: 'פן', durationMinutes: 30, color: 'cream' },
  { id: 's4', name: 'טיפול שיער', durationMinutes: 60, color: 'lavender' },
];

const PROVIDERS: ServiceProvider[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: "יובל תורג'מן" },
  { id: '22222222-2222-2222-2222-222222222222', name: "אביבית תורג'מן" },
];

export function getMockServiceProviders(): ServiceProvider[] {
  return PROVIDERS;
}

const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'שרה לוי' },
  { id: 'c2', name: 'רחל ישראלי' },
  { id: 'c3', name: 'נועה כץ' },
  { id: 'c4', name: 'מרים אברהם' },
  { id: 'c5', name: 'הדר שמיר' },
  { id: 'c6', name: 'אסתר גולן' },
];

function at(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function getMockAppointments(date: Date): Appointment[] {
  if (date.getDay() === 6) return []; // Saturday — empty state demo

  return [
    {
      id: 'a1',
      customer: CUSTOMERS[0],
      service: SERVICES[0],
      provider: PROVIDERS[0],
      startTime: at(date, 9, 0),
      endTime: at(date, 9, 45),
      status: 'scheduled',
    },
    {
      id: 'a2',
      customer: CUSTOMERS[1],
      service: SERVICES[1],
      provider: PROVIDERS[1],
      startTime: at(date, 9, 0),
      endTime: at(date, 11, 15),
      status: 'completed',
    },
    {
      id: 'a3',
      customer: CUSTOMERS[2],
      service: SERVICES[2],
      provider: PROVIDERS[0],
      startTime: at(date, 11, 30),
      endTime: at(date, 12, 0),
      status: 'cancelled_by_customer',
    },
    {
      id: 'a4',
      customer: CUSTOMERS[3],
      service: SERVICES[3],
      provider: PROVIDERS[1],
      startTime: at(date, 13, 0),
      endTime: at(date, 14, 0),
      status: 'scheduled',
    },
    {
      id: 'a5',
      customer: CUSTOMERS[4],
      service: SERVICES[0],
      provider: PROVIDERS[0],
      startTime: at(date, 14, 30),
      endTime: at(date, 15, 15),
      status: 'no_show',
    },
    {
      id: 'a6',
      customer: CUSTOMERS[5],
      service: SERVICES[1],
      provider: PROVIDERS[1],
      startTime: at(date, 15, 30),
      endTime: at(date, 17, 0),
      status: 'scheduled',
    },
  ];
}
