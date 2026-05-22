import { IsEnum } from 'class-validator';

export class UpdateBusinessUserRoleDto {
  @IsEnum(['MEMBER', 'MANAGER'], { message: 'role must be MEMBER or MANAGER' })
  role!: 'MEMBER' | 'MANAGER';
}
