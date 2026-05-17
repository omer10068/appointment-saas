import type {
  CreateCustomerPayload,
  CreateServicePayload,
  DashboardCustomerDto,
  DashboardServiceDto,
  DashboardSummaryDto,
  UpdateCustomerPayload,
  UpdateCustomerStatusPayload,
  UpdateServicePayload,
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
