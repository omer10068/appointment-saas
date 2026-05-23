import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

export class AvailableSlotsQueryDto {
  @IsUUID()
  serviceId!: string;

  @IsUUID()
  serviceProviderId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalMinutes?: number;
}
