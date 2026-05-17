import {
  IsBoolean,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = { message: 'must be in HH:mm format' };

export class WorkingHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsBoolean()
  isClosed!: boolean;

  @ValidateIf((o: WorkingHourItemDto) => !o.isClosed)
  @IsString()
  @Matches(TIME_PATTERN, TIME_MESSAGE)
  startTime?: string | null;

  @ValidateIf((o: WorkingHourItemDto) => !o.isClosed)
  @IsString()
  @Matches(TIME_PATTERN, TIME_MESSAGE)
  endTime?: string | null;
}
