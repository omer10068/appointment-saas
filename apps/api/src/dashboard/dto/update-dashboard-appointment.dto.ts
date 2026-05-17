import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateDashboardAppointmentDto {
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsUUID()
  @IsOptional()
  staffMemberId?: string | null;

  @IsDateString()
  @IsOptional()
  startsAt?: string;
}
