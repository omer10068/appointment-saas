import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminBusinessesController } from './admin-businesses.controller';

@Module({
  imports: [BusinessesModule],
  controllers: [AdminBusinessesController],
})
export class AdminModule {}
