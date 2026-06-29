import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkProvisioningService } from './clerk-provisioning.service';

@Module({
  controllers: [AuthController],
  providers: [ClerkAuthGuard, ClerkProvisioningService],
  exports: [ClerkAuthGuard, ClerkProvisioningService],
})
export class AuthModule {}
