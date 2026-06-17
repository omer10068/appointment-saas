import { IsEnum } from 'class-validator';
import { BusinessStatus } from '../../generated/prisma/client';

export class SetBusinessStatusDto {
  @IsEnum([BusinessStatus.TRIAL, BusinessStatus.ACTIVE], {
    message: 'status must be TRIAL or ACTIVE',
  })
  status!: typeof BusinessStatus.TRIAL | typeof BusinessStatus.ACTIVE;
}

// Kept for backward compatibility with any existing imports
export { SetBusinessStatusDto as SetBusinessTrialDto };
