import { fetchWithAuth } from './api';

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
}

export function fetchAdminBusinesses(
  getToken: () => Promise<string | null>,
): Promise<AdminBusinessListItemDto[]> {
  return fetchWithAuth<AdminBusinessListItemDto[]>('/admin/businesses', getToken);
}
