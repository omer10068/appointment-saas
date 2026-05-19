import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateAvailabilityExceptionDto {
  @IsString()
  @IsOptional()
  serviceProviderId?: string | null;

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  @IsOptional()
  startTime?: string | null;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  @IsOptional()
  endTime?: string | null;

  @IsString()
  @IsOptional()
  reason?: string | null;
}
