import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateStaffMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @IsUUID()
  businessUserId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  serviceIds!: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
