export const BusinessStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  TRIAL: 'TRIAL',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;

export type BusinessStatus =
  (typeof BusinessStatus)[keyof typeof BusinessStatus];

export const BusinessUserRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
} as const;

export type BusinessUserRole =
  (typeof BusinessUserRole)[keyof typeof BusinessUserRole];

export const BusinessUserStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

export type BusinessUserStatus =
  (typeof BusinessUserStatus)[keyof typeof BusinessUserStatus];

export const CustomerStatus = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type CustomerStatus =
  (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const PlatformRole = {
  USER: 'USER',
  SUPPORT: 'SUPPORT',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type PlatformRole =
  (typeof PlatformRole)[keyof typeof PlatformRole];

export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED_BY_CUSTOMER: 'CANCELLED_BY_CUSTOMER',
  CANCELLED_BY_BUSINESS: 'CANCELLED_BY_BUSINESS',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];
