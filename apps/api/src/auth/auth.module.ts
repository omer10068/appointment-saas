import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
