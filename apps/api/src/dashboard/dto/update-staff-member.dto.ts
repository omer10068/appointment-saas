import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateStaffMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  businessUserId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
