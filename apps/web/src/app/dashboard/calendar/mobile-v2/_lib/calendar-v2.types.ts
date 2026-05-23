export type ServiceColor = 'rose' | 'mint' | 'peach' | 'lavender';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  color: ServiceColor;
}

export interface ServiceProvider {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export interface Appointment {
  id: string;
  customer: Customer;
  service: Service;
  provider: ServiceProvider;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes?: string;
}
