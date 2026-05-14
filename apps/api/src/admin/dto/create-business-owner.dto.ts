import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CreateBusinessOwnerDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;
}
