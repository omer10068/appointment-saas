import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceCents?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  bufferBeforeMin?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  bufferAfterMin?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
