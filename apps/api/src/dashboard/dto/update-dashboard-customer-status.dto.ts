import { IsEnum } from 'class-validator';

export class UpdateDashboardCustomerStatusDto {
  @IsEnum(['ACTIVE', 'BLOCKED', 'ARCHIVED'])
  status!: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
}
