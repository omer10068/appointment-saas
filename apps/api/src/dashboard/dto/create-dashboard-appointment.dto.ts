import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateDashboardAppointmentDto {
  @IsUUID()
  businessCustomerId!: string;

  @IsUUID()
  serviceId!: string;

  @IsUUID()
  @IsOptional()
  staffMemberId?: string | null;

  @IsDateString()
  startsAt!: string;
}
