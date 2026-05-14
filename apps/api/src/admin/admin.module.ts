import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { BusinessUsersModule } from '../business-users/business-users.module';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminBusinessesService } from './admin-businesses.service';

@Module({
  imports: [BusinessesModule, BusinessUsersModule],
  controllers: [AdminBusinessesController],
  providers: [AdminBusinessesService],
})
export class AdminModule {}
