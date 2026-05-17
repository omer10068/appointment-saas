import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkingHourItemDto } from './working-hour-item.dto';

export class UpsertWorkingHoursDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHourItemDto)
  hours!: WorkingHourItemDto[];
}
