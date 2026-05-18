import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDashboardCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  // Raw phone input — backend will normalize to E.164 (phoneNormalized).
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsEnum(['ACTIVE', 'BLOCKED', 'ARCHIVED'])
  @IsOptional()
  status?: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
}
