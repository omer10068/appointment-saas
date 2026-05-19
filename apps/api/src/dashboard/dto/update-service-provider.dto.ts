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

export class UpdateServiceProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  // When provided, replaces all service links for this ServiceProvider.
  // If the ServiceProvider is active, at least one serviceId is required.
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  @IsOptional()
  serviceIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
