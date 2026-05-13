import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminBusinessesService } from './admin-businesses.service';

@Module({
  imports: [BusinessesModule],
  controllers: [AdminBusinessesController],
  providers: [AdminBusinessesService],
})
export class AdminModule {}
