import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessUsersService } from './business-users.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [BusinessUsersService],
  exports: [BusinessUsersService],
})
export class BusinessUsersModule {}
