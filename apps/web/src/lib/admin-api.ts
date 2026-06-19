import { fetchWithAuth } from './api';

// ─── Business list ────────────────────────────────────────────────────────────

export interface AdminBusinessListItemDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  publicBookingEnabled: boolean;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export function fetchAdminBusinesses(
  getToken: () => Promise<string | null>,
): Promise<AdminBusinessListItemDto[]> {
  return fetchWithAuth<AdminBusinessListItemDto[]>('/admin/businesses', getToken);
}

// ─── Onboarding summary ───────────────────────────────────────────────────────

export interface AdminReadinessChecks {
  hasActiveOwner: boolean;
  hasActiveService: boolean;
  hasActiveServiceProvider: boolean;
  hasBusinessWorkingHours: boolean;
  allActiveProvidersHaveWorkingHours: boolean;
  allActiveProvidersHaveActiveServiceAssignment: boolean;
  allActiveServicesHaveActiveProviderAssignment: boolean;
}

export interface AdminReadinessDto {
  isReady: boolean;
  checks: AdminReadinessChecks;
  blockingReasons: string[];
}

export interface AdminOnboardingSummaryDto {
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    timezone: string;
    publicBookingEnabled: boolean;
  };
  users: Array<{
    id: string;
    role: string;
    status: string;
    user: {
      id: string;
      phone: string;
      email: string | null;
    };
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number | null;
    isActive: boolean;
  }>;
  serviceProviders: Array<{
    id: string;
    displayName: string;
    isActive: boolean;
    businessUserId: string;
    serviceIds: string[];
    hasWorkingHours: boolean;
  }>;
  businessWorkingHours: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string | null;
    endTime: string | null;
    isClosed: boolean;
  }>;
  readiness: AdminReadinessDto;
}

export function fetchAdminOnboardingSummary(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<AdminOnboardingSummaryDto> {
  return fetchWithAuth<AdminOnboardingSummaryDto>(
    `/admin/businesses/${businessId}/onboarding-summary`,
    getToken,
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface AdminCreateBusinessPayload {
  name: string;
  slug: string;
  timezone: string;
}

export interface AdminCreatedBusinessDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  locale: string;
  currency: string;
  publicBookingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createAdminBusiness(
  payload: AdminCreateBusinessPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminCreatedBusinessDto> {
  return fetchWithAuth<AdminCreatedBusinessDto>('/admin/businesses', getToken, {
    method: 'POST',
    body: payload,
  });
}

export interface AdminCreateOwnerPayload {
  email: string;
  phone: string;
}

export interface AdminCreatedOwnerDto {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  status: string;
}

export function createAdminBusinessOwner(
  businessId: string,
  payload: AdminCreateOwnerPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminCreatedOwnerDto> {
  return fetchWithAuth<AdminCreatedOwnerDto>(
    `/admin/businesses/${businessId}/owner`,
    getToken,
    { method: 'POST', body: payload },
  );
}
