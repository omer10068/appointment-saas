export type ServiceColor = 'rose' | 'mint' | 'cream' | 'lavender' | 'sky';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_customer'
  | 'cancelled_by_business'
  | 'no_show';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  color: ServiceColor;
}

export interface ServiceProvider {
  id: string;
  name: string;
  /** BusinessUser.id of the linked staff member, if any. Used to auto-select the current user's lane. */
  businessUserId?: string;
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
