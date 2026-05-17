import { IsBoolean } from 'class-validator';

export class UpdateStaffMemberStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
