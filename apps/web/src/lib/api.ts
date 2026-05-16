import type {
  DashboardCustomerDto,
  DashboardServiceDto,
  DashboardSummaryDto,
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

export function fetchDashboardServices(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardServiceDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/services`,
    getToken,
  );
}

export function fetchDashboardCustomers(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardCustomerDto[]> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/customers`,
    getToken,
  );
}

export function fetchDashboardSummary(
  businessId: string,
  getToken: () => Promise<string | null>,
): Promise<DashboardSummaryDto> {
  return fetchWithAuth(
    `/dashboard/businesses/${businessId}/summary`,
    getToken,
  );
}
