import {
  IsEmail,
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

  // Raw phone input — backend will normalize to E.164 and check for duplicates.
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
