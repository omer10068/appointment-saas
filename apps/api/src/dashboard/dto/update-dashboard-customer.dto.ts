import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDashboardCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsEnum(['ACTIVE', 'BLOCKED', 'ARCHIVED'])
  @IsOptional()
  status?: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
}
