import { IsDateString, IsUUID } from 'class-validator';

export class CreateDashboardAppointmentDto {
  @IsUUID()
  businessCustomerId!: string;

  @IsUUID()
  serviceId!: string;

  @IsUUID()
  staffMemberId!: string;

  @IsDateString()
  startsAt!: string;
}
