import type { BusinessStatus, BusinessUserRole, BusinessUserStatus } from './enums';

export interface BusinessDto {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  createdAt?: string;
  updatedAt?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
}

export interface BusinessUserDto {
  id: string;
  businessId?: string;
  userId?: string;
  role: BusinessUserRole;
  status: BusinessUserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessUserWithBusinessDto extends BusinessUserDto {
  business: BusinessDto;
}

export interface CreateBusinessRequest {
  name: string;
  slug: string;
}

export interface AssignBusinessOwnerRequest {
  email: string;
}
