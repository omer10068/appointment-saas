import { IsDateString, IsIn, IsOptional } from 'class-validator';

const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_BUSINESS',
  'COMPLETED',
  'NO_SHOW',
] as const;

export class AppointmentQueryDto {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsIn(APPOINTMENT_STATUSES)
  @IsOptional()
  status?: string;
}
