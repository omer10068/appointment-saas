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

  @IsEnum(['MEMBER', 'MANAGER'], {
    message: 'role must be MEMBER or MANAGER',
  })
  role!: 'MEMBER' | 'MANAGER';
}
