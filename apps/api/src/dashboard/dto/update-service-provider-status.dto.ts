import { IsBoolean } from 'class-validator';

export class UpdateServiceProviderStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
