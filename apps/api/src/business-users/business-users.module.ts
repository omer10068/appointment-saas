import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessUsersService } from './business-users.service';

@Module({
  imports: [PrismaModule],
  providers: [BusinessUsersService],
  exports: [BusinessUsersService],
})
export class BusinessUsersModule {}
