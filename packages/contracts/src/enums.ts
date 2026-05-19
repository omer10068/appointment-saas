export type BusinessStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'SUSPENDED'
  | 'CANCELLED';

export type BusinessUserRole =
  | 'OWNER'
  | 'MANAGER'
  | 'MEMBER';

export type BusinessUserStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'BLOCKED';

export type CustomerStatus =
  | 'ACTIVE'
  | 'BLOCKED'
  | 'ARCHIVED';

export type PlatformRole =
  | 'USER'
  | 'SUPPORT'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_BUSINESS'
  | 'COMPLETED'
  | 'NO_SHOW';
