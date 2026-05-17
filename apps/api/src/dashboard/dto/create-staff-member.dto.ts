import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStaffMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @IsOptional()
  businessUserId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
