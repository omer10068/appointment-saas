import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SlotsEngineModule } from '../slots-engine/slots-engine.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailableSlotsController } from './available-slots.controller';
import { AvailableSlotsService } from './available-slots.service';
import { DashboardDataController } from './dashboard-data.controller';
import { DashboardDataService } from './dashboard-data.service';

@Module({
  imports: [AuthModule, SlotsEngineModule],
  controllers: [
    DashboardDataController,
    AvailabilityController,
    AppointmentsController,
    AvailableSlotsController,
  ],
  providers: [
    DashboardDataService,
    AvailabilityService,
    AvailableSlotsService,
    AppointmentsService,
  ],
})
export class DashboardModule {}
