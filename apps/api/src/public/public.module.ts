import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlotsEngineModule } from '../slots-engine/slots-engine.module';
import { PublicBusinessesController } from './public-businesses.controller';
import { PublicBusinessesService } from './public-businesses.service';
import { PublicSlotsService } from './public-slots.service';

@Module({
  imports: [PrismaModule, SlotsEngineModule],
  controllers: [PublicBusinessesController],
  providers: [PublicBusinessesService, PublicSlotsService],
})
export class PublicModule {}
