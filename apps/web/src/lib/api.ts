import type {
  CreateAppointmentPayload,
  CreateAvailabilityExceptionPayload,
  CreateBusinessUserPayload,
  CreateCustomerPayload,
  CreateServicePayload,
  CreateServiceProviderPayload,
  DashboardAppointmentDto,
  DashboardAvailabilityExceptionDto,
  DashboardBusinessUserCreatedDto,
  DashboardBusinessUserDto,
  DashboardCustomerDto,
  DashboardServiceDto,
  DashboardServiceProviderDto,
  DashboardSummaryDto,
  DashboardWorkingHourDto,
  UpdateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  UpdateAvailabilityExceptionPayload,
  UpdateCustomerPayload,
  UpdateCustomerStatusPayload,
  UpdateServicePayload,
  UpdateServiceProviderPayload,
  UpdateServiceProviderStatusPayload,
  UpdateWorkingHoursPayload,
} from '@appointment/contracts';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions {
  method?: string;
  body?: unknown;
}

export async function fetchWithAuth<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: FetchOptions = {},
): Promise<T> {
  const token = await getToken();
  const { method = 'GET', body } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text) as { message?: string };
      message = json.message ?? text;
    } catch {
      message = text;
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

// ─── Services (read) ──────────────────────────────────────────────────────────

export function fetchDashboardServices(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/services`,
    getToken,
  );
}

// ─── Services (mutations) ─────────────────────────────────────────────────────

export function createDashboardService(
  businessId: string,
  payload: CreateServicePayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/services`,
    getToken,
    { method: 'POST', body: payload },
  );
}

export function updateDashboardService(
  businessId: string,
  serviceId: string,
  payload: UpdateServicePayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/services/${serviceId}`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

export function updateDashboardServiceStatus(
  businessId: string,
  serviceId: string,
  isActive: boolean,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/services/${serviceId}/status`,
    getToken,
    { method: 'PATCH', body: { isActive } },
  );
}

// ─── Customers (read) ─────────────────────────────────────────────────────────

export function fetchDashboardCustomers(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardCustomerDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/customers`,
    getToken,
  );
}

// ─── Customers (mutations) ────────────────────────────────────────────────────

export function createDashboardCustomer(
  businessId: string,
  payload: CreateCustomerPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardCustomerDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/customers`,
    getToken,
    { method: 'POST', body: payload },
  );
}

export function updateDashboardCustomer(
  businessId: string,
  businessCustomerId: string,
  payload: UpdateCustomerPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardCustomerDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/customers/${businessCustomerId}`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

export function updateDashboardCustomerStatus(
  businessId: string,
  businessCustomerId: string,
  payload: UpdateCustomerStatusPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardCustomerDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/customers/${businessCustomerId}/status`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

// ─── Business users (read) ───────────────────────────────────────────────────

export function fetchDashboardBusinessUsers(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardBusinessUserDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/users`,
    getToken,
  );
}

// ─── Business users (mutations) ──────────────────────────────────────────────

export function createDashboardBusinessUser(
  businessId: string,
  payload: CreateBusinessUserPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardBusinessUserCreatedDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/users`,
    getToken,
    { method: 'POST', body: payload },
  );
}

// ─── Service providers (read) ─────────────────────────────────────────────────

export function fetchDashboardServiceProviders(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceProviderDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers`,
    getToken,
  );
}

// ─── Service providers (mutations) ────────────────────────────────────────────

export function createDashboardServiceProvider(
  businessId: string,
  payload: CreateServiceProviderPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceProviderDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers`,
    getToken,
    { method: 'POST', body: payload },
  );
}

export function updateDashboardServiceProvider(
  businessId: string,
  serviceProviderId: string,
  payload: UpdateServiceProviderPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceProviderDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers/${serviceProviderId}`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

export function updateDashboardServiceProviderStatus(
  businessId: string,
  serviceProviderId: string,
  payload: UpdateServiceProviderStatusPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceProviderDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers/${serviceProviderId}/status`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

// ─── Working hours (business) ─────────────────────────────────────────────────

export function fetchBusinessWorkingHours(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardWorkingHourDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/working-hours`,
    getToken,
  );
}

export function updateBusinessWorkingHours(
  businessId: string,
  payload: UpdateWorkingHoursPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardWorkingHourDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/working-hours`,
    getToken,
    { method: 'PUT', body: payload },
  );
}

// ─── Working hours (service provider) ────────────────────────────────────────

export function fetchServiceProviderWorkingHours(
  businessId: string,
  serviceProviderId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardWorkingHourDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers/${serviceProviderId}/working-hours`,
    getToken,
  );
}

export function updateServiceProviderWorkingHours(
  businessId: string,
  serviceProviderId: string,
  payload: UpdateWorkingHoursPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardWorkingHourDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/service-providers/${serviceProviderId}/working-hours`,
    getToken,
    { method: 'PUT', body: payload },
  );
}

// ─── Availability exceptions ──────────────────────────────────────────────────

export function fetchAvailabilityExceptions(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardAvailabilityExceptionDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/availability-exceptions`,
    getToken,
  );
}

export function createAvailabilityException(
  businessId: string,
  payload: CreateAvailabilityExceptionPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardAvailabilityExceptionDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/availability-exceptions`,
    getToken,
    { method: 'POST', body: payload },
  );
}

export function updateAvailabilityException(
  businessId: string,
  exceptionId: string,
  payload: UpdateAvailabilityExceptionPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardAvailabilityExceptionDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/availability-exceptions/${exceptionId}`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

export function deleteAvailabilityException(
  businessId: string,
  exceptionId: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/availability-exceptions/${exceptionId}`,
    getToken,
    { method: 'DELETE' },
  );
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function fetchDashboardAppointments(
  businessId: string,
  getToken: () => Promise<string | null>,
  query?: { from?: string; to?: string; status?: string; businessCustomerId?: string },
): Promise<DashboardAppointmentDto[]> {
  const params = new URLSearchParams();
  if (query?.from) params.set('from', query.from);
  if (query?.to) params.set('to', query.to);
  if (query?.status) params.set('status', query.status);
  if (query?.businessCustomerId) params.set('businessCustomerId', query.businessCustomerId);
  const qs = params.toString();
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/appointments${qs ? `?${qs}` : ''}`,
    getToken,
  );
}

export function createDashboardAppointment(
  businessId: string,
  payload: CreateAppointmentPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardAppointmentDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/appointments`,
    getToken,
    { method: 'POST', body: payload },
  );
}

export function updateDashboardAppointment(
  businessId: string,
  appointmentId: string,
  payload: UpdateAppointmentPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardAppointmentDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/appointments/${appointmentId}`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

export function updateDashboardAppointmentStatus(
  businessId: string,
  appointmentId: string,
  payload: UpdateAppointmentStatusPayload,
  getToken: () => Promise<string | null>,
): Promise<DashboardAppointmentDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/appointments/${appointmentId}/status`,
    getToken,
    { method: 'PATCH', body: payload },
  );
}

// ─── Available slots ──────────────────────────────────────────────────────────

/**
 * One bookable slot as returned by the backend.
 * `startsAt` / `endsAt` are UTC ISO strings — pass `startsAt` directly to
 * CreateAppointmentPayload; do not recalculate from local times.
 * `localStartTime` / `localEndTime` are HH:MM strings in the business timezone
 * and should be used only for display.
 */
export interface AvailableSlotItem {
  startsAt: string;
  endsAt: string;
  localStartTime: string;
  localEndTime: string;
}

export interface AvailableSlotsResponse {
  date: string;
  timezone: string;
  serviceId: string;
  serviceProviderId: string;
  durationMinutes: number;
  intervalMinutes: number;
  slots: AvailableSlotItem[];
}

export function fetchAvailableSlots(
  businessId: string,
  query: {
    serviceId: string;
    serviceProviderId: string;
    date: string; // YYYY-MM-DD in business timezone
    intervalMinutes?: number;
  },
  getToken: () => Promise<string | null>,
): Promise<AvailableSlotsResponse> {
  const params = new URLSearchParams({
    serviceId: query.serviceId,
    serviceProviderId: query.serviceProviderId,
    date: query.date,
  });
  if (query.intervalMinutes != null) {
    params.set('intervalMinutes', String(query.intervalMinutes));
  }
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/available-slots?${params.toString()}`,
    getToken,
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function fetchDashboardSummary(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardSummaryDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/summary`,
    getToken,
  );
}
