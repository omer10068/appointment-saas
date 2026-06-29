import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { BusinessUsersModule } from '../business-users/business-users.module';
import { AuthModule } from '../auth/auth.module';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminBusinessesService } from './admin-businesses.service';

@Module({
  imports: [BusinessesModule, BusinessUsersModule, AuthModule],
  controllers: [AdminBusinessesController],
  providers: [AdminBusinessesService],
})
export class AdminModule {}
