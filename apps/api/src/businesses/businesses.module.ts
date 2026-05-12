import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [PrismaModule],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
