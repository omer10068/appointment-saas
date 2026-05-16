import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

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
