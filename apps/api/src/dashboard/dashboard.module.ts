import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardDataController } from './dashboard-data.controller';
import { DashboardDataService } from './dashboard-data.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardDataController],
  providers: [DashboardDataService],
})
export class DashboardModule {}
