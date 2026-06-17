import { IsEnum } from 'class-validator';
import { BusinessStatus } from '../../generated/prisma/client';

export class SetBusinessTrialDto {
  @IsEnum([BusinessStatus.TRIAL], {
    message: 'status must be TRIAL',
  })
  status!: typeof BusinessStatus.TRIAL;
}
