import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBusinessUserDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim().toLowerCase())
  email?: string | null;

  @IsEnum(['MEMBER', 'MANAGER'], {
    message: 'role must be MEMBER or MANAGER',
  })
  role!: 'MEMBER' | 'MANAGER';
}
