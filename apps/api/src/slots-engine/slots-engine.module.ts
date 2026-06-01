import { Module } from '@nestjs/common';
import { BookingValidationService } from '../dashboard/booking-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailableSlotsEngineService } from './available-slots-engine.service';

@Module({
  imports: [PrismaModule],
  providers: [BookingValidationService, AvailableSlotsEngineService],
  exports: [BookingValidationService, AvailableSlotsEngineService],
})
export class SlotsEngineModule {}
