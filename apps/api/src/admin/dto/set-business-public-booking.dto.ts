import { IsBoolean } from 'class-validator';

export class SetBusinessPublicBookingDto {
  @IsBoolean()
  publicBookingEnabled!: boolean;
}
