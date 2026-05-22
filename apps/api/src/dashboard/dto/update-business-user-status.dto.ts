import { IsEnum } from 'class-validator';

export class UpdateBusinessUserStatusDto {
  @IsEnum(['ACTIVE', 'BLOCKED'], {
    message: 'status must be ACTIVE or BLOCKED',
  })
  status!: 'ACTIVE' | 'BLOCKED';
}
