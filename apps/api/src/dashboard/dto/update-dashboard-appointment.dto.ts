import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateDashboardAppointmentDto {
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  // May be provided to change the provider; if omitted, keeps existing value.
  // Cannot be set to null — serviceProviderId is always required on an Appointment.
  @IsUUID()
  @IsOptional()
  serviceProviderId?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;
}
