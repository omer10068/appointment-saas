import { IsIn, IsString } from 'class-validator';

const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_BUSINESS',
  'COMPLETED',
  'NO_SHOW',
] as const;

export class UpdateDashboardAppointmentStatusDto {
  @IsString()
  @IsIn(APPOINTMENT_STATUSES)
  status!: string;
}
