import type { AppointmentStatus, CustomerStatus } from './enums';

export interface DashboardServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export interface DashboardCustomerDto {
  businessCustomerId: string;
  customerProfileId: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: CustomerStatus;
  notes: string | null;
}

export interface DashboardBusinessUserDto {
  id: string;
  userId: string;
  role: string;
  status: string;
  hasServiceProviderProfile: boolean;
}

export interface DashboardBusinessReadinessDto {
  hasActiveServiceProviders: boolean;
  hasActiveService: boolean;
  isReady: boolean;
}

export interface DashboardSummaryDto {
  servicesCount: number;
  activeServicesCount: number;
  customersCount: number;
  activeCustomersCount: number;
}

// ─── Business user payloads ───────────────────────────────────────────────────

export interface CreateBusinessUserPayload {
  phone: string;
  email?: string | null;
  role: 'MEMBER' | 'MANAGER';
}

export interface DashboardBusinessUserCreatedDto {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  status: string;
  phoneNormalized: string;
  email: string | null;
  serviceProviderId: string | null;
}

// ─── Service payloads ─────────────────────────────────────────────────────────

export interface CreateServicePayload {
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents?: number | null;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  isActive?: boolean;
}

export interface UpdateServicePayload {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  priceCents?: number | null;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  isActive?: boolean;
}

// ─── Customer payloads ────────────────────────────────────────────────────────

export interface CreateCustomerPayload {
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
}

export interface UpdateCustomerPayload {
  fullName?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerStatusPayload {
  status: CustomerStatus;
}

// ─── Service provider payloads ────────────────────────────────────────────────

export interface DashboardServiceProviderDto {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string;
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceProviderPayload {
  displayName: string;
  businessUserId: string;
  serviceIds: string[];
  isActive?: boolean;
}

export interface UpdateServiceProviderPayload {
  displayName?: string;
  serviceIds?: string[];
  isActive?: boolean;
}

export interface UpdateServiceProviderStatusPayload {
  isActive: boolean;
}

// ─── Working hours ────────────────────────────────────────────────────────────

export interface DashboardWorkingHourDto {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
}

export interface WorkingHourItemPayload {
  dayOfWeek: number;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface UpdateWorkingHoursPayload {
  hours: WorkingHourItemPayload[];
}

// ─── Availability exceptions ──────────────────────────────────────────────────

export interface DashboardAvailabilityExceptionDto {
  id: string;
  businessId: string;
  serviceProviderId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: string;
}

export interface CreateAvailabilityExceptionPayload {
  date: string;
  serviceProviderId?: string | null;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export interface UpdateAvailabilityExceptionPayload {
  serviceProviderId?: string | null;
  isClosed?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface DashboardAppointmentDto {
  id: string;
  businessId: string;
  businessCustomerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  serviceProviderId: string;
  serviceProviderName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentPayload {
  businessCustomerId: string;
  serviceId: string;
  serviceProviderId: string;
  startsAt: string;
}

export interface UpdateAppointmentPayload {
  serviceId?: string;
  serviceProviderId?: string;
  startsAt?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
}
