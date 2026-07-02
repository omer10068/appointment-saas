import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkProvisioningService } from './clerk-provisioning.service';
import { ClerkInvitationsService } from './clerk-invitations.service';

@Module({
  controllers: [AuthController],
  providers: [
    ClerkAuthGuard,
    ClerkProvisioningService,
    ClerkInvitationsService,
  ],
  exports: [ClerkAuthGuard, ClerkProvisioningService, ClerkInvitationsService],
})
export class AuthModule {}
