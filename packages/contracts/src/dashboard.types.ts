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
