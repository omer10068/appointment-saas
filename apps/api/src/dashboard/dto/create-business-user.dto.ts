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
  email?: string | null;

  @IsEnum(['STAFF', 'MANAGER'], {
    message: 'role must be STAFF or MANAGER',
  })
  role!: 'STAFF' | 'MANAGER';
}
