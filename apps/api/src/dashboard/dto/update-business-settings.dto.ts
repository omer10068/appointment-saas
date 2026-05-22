import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @IsOptional()
  timezone?: string;

  @Matches(/^[a-z]{2,3}(-[A-Z]{2,3})?$/, {
    message: 'locale must be a valid locale tag (e.g. en, en-US, he-IL)',
  })
  @IsOptional()
  locale?: string;

  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code (e.g. USD, ILS)' })
  @IsOptional()
  currency?: string;
}
