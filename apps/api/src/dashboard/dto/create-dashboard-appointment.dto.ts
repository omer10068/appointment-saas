import { IsDateString, IsUUID } from 'class-validator';

export class CreateDashboardAppointmentDto {
  @IsUUID()
  businessCustomerId!: string;

  @IsUUID()
  serviceId!: string;

  @IsUUID()
  serviceProviderId!: string;

  @IsDateString()
  startsAt!: string;
}
