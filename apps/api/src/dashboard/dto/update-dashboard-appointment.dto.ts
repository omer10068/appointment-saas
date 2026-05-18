import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateDashboardAppointmentDto {
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  // May be provided to change staff; if omitted, keeps existing value.
  // Cannot be set to null — staffMemberId is always required on an Appointment.
  @IsUUID()
  @IsOptional()
  staffMemberId?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;
}
