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

// ─── Manager creation ─────────────────────────────────────────────────────────

export interface AdminCreateManagerPayload {
  email: string;
  phone: string;
  role: 'MANAGER';
}

export interface AdminCreatedManagerDto {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  status: string;
  phoneNormalized: string;
  email: string | null;
  serviceProviderId: string | null;
}

export function createAdminManager(
  businessId: string,
  payload: AdminCreateManagerPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminCreatedManagerDto> {
  return fetchWithAuth<AdminCreatedManagerDto>(
    `/admin/businesses/${businessId}/users`,
    getToken,
    { method: 'POST', body: payload },
  );
}

// ─── Service creation ─────────────────────────────────────────────────────────

export interface AdminCreateServicePayload {
  name: string;
  durationMinutes: number;
  priceCents?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export interface AdminCreatedServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export function createAdminService(
  businessId: string,
  payload: AdminCreateServicePayload,
  getToken: () => Promise<string | null>,
): Promise<AdminCreatedServiceDto> {
  return fetchWithAuth<AdminCreatedServiceDto>(
    `/admin/businesses/${businessId}/services`,
    getToken,
    { method: 'POST', body: payload },
  );
}

// ─── ServiceProvider creation ─────────────────────────────────────────────────

export interface AdminCreateServiceProviderPayload {
  displayName: string;
  businessUserId: string;
  serviceIds: string[];
  isActive?: boolean;
}

export interface AdminCreatedServiceProviderDto {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string;
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function createAdminServiceProvider(
  businessId: string,
  payload: AdminCreateServiceProviderPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminCreatedServiceProviderDto> {
  return fetchWithAuth<AdminCreatedServiceProviderDto>(
    `/admin/businesses/${businessId}/service-providers`,
    getToken,
    { method: 'POST', body: payload },
  );
}

// ─── Working hours ─────────────────────────────────────────────────────────────

export interface AdminWorkingHourItem {
  dayOfWeek: number;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface AdminWorkingHoursPayload {
  hours: AdminWorkingHourItem[];
}

export interface AdminWorkingHourDto {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
}

export function fetchAdminBusinessWorkingHours(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<AdminWorkingHourDto[]> {
  return fetchWithAuth<AdminWorkingHourDto[]>(
    `/admin/businesses/${businessId}/working-hours`,
    getToken,
  );
}

export function setAdminBusinessWorkingHours(
  businessId: string,
  payload: AdminWorkingHoursPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminWorkingHourDto[]> {
  return fetchWithAuth<AdminWorkingHourDto[]>(
    `/admin/businesses/${businessId}/working-hours`,
    getToken,
    { method: 'PUT', body: payload },
  );
}

export function fetchAdminServiceProviderWorkingHours(
  businessId: string,
  serviceProviderId: string,
  getToken: () => Promise<string | null>,
): Promise<AdminWorkingHourDto[]> {
  return fetchWithAuth<AdminWorkingHourDto[]>(
    `/admin/businesses/${businessId}/service-providers/${serviceProviderId}/working-hours`,
    getToken,
  );
}

export function setAdminServiceProviderWorkingHours(
  businessId: string,
  serviceProviderId: string,
  payload: AdminWorkingHoursPayload,
  getToken: () => Promise<string | null>,
): Promise<AdminWorkingHourDto[]> {
  return fetchWithAuth<AdminWorkingHourDto[]>(
    `/admin/businesses/${businessId}/service-providers/${serviceProviderId}/working-hours`,
    getToken,
    { method: 'PUT', body: payload },
  );
}

// ─── Readiness ─────────────────────────────────────────────────────────────────

export function fetchAdminReadiness(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<AdminReadinessDto> {
  return fetchWithAuth<AdminReadinessDto>(
    `/admin/businesses/${businessId}/readiness`,
    getToken,
  );
}

// ─── Business status ───────────────────────────────────────────────────────────

export interface AdminSetStatusPayload {
  status: 'TRIAL' | 'ACTIVE';
}

export interface AdminBusinessStatusDto {
  id: string;
  status: string;
}

export function setAdminBusinessStatus(
  businessId: string,
  status: AdminSetStatusPayload['status'],
  getToken: () => Promise<string | null>,
): Promise<AdminBusinessStatusDto> {
  return fetchWithAuth<AdminBusinessStatusDto>(
    `/admin/businesses/${businessId}/status`,
    getToken,
    { method: 'PATCH', body: { status } },
  );
}
