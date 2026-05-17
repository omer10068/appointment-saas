import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { DashboardDataController } from './dashboard-data.controller';
import { DashboardDataService } from './dashboard-data.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardDataController, AvailabilityController],
  providers: [DashboardDataService, AvailabilityService],
})
export class DashboardModule {}
