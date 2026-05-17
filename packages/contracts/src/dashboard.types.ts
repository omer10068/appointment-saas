import type { CustomerStatus } from './enums';

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
  phone: string | null;
  status: CustomerStatus;
  notes: string | null;
}

export interface DashboardSummaryDto {
  servicesCount: number;
  activeServicesCount: number;
  customersCount: number;
  activeCustomersCount: number;
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
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
}

export interface UpdateCustomerPayload {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
}

export interface UpdateCustomerStatusPayload {
  status: CustomerStatus;
}

// ─── Staff payloads ───────────────────────────────────────────────────────────

export interface DashboardStaffMemberDto {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffMemberPayload {
  displayName: string;
  businessUserId?: string | null;
  isActive?: boolean;
}

export interface UpdateStaffMemberPayload {
  displayName?: string;
  businessUserId?: string | null;
  isActive?: boolean;
}

export interface UpdateStaffMemberStatusPayload {
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
  staffMemberId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: string;
}

export interface CreateAvailabilityExceptionPayload {
  date: string;
  staffMemberId?: string | null;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export interface UpdateAvailabilityExceptionPayload {
  staffMemberId?: string | null;
  isClosed?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}
