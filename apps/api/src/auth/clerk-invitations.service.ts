import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

export const BUSINESS_INVITATION_EXPIRES_IN_DAYS = 7;

export interface CreatedOwnerInvitation {
  clerkInvitationId: string;
  expiresAt: Date;
}

@Injectable()
export class ClerkInvitationsService {
  private readonly logger = new Logger(ClerkInvitationsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a Clerk Application Invitation for a business OWNER.
   *
   * publicMetadata.businessInvitationId is carried by Clerk onto the created
   * Clerk user's own publicMetadata once the invitee accepts — ClerkAuthGuard's
   * claim path reads it back from there to find the matching BusinessInvitation
   * row on first login, with no webhook involved.
   *
   * ignoreExisting keeps retries safe at the Clerk layer (mirrors the
   * idempotent-on-retry intent of ClerkProvisioningService.findOrCreateClerkUser).
   */
  async createOwnerInvitation(dto: {
    email: string;
    businessInvitationId: string;
  }): Promise<CreatedOwnerInvitation> {
    const secretKey = this.configService.getOrThrow<string>('CLERK_SECRET_KEY');
    const clerk = createClerkClient({ secretKey });

    try {
      const created = await clerk.invitations.createInvitation({
        emailAddress: dto.email,
        publicMetadata: { businessInvitationId: dto.businessInvitationId },
        expiresInDays: BUSINESS_INVITATION_EXPIRES_IN_DAYS,
        ignoreExisting: true,
        notify: true,
      });
      this.logger.debug(
        `ClerkInvitations: created invitation id=${created.id} for businessInvitationId=${dto.businessInvitationId}`,
      );
      return {
        clerkInvitationId: created.id,
        expiresAt: new Date(
          Date.now() +
            BUSINESS_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
        ),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ClerkInvitations: Clerk API error: ${message}`);
      throw new BadGatewayException('Clerk invitation creation failed');
    }
  }
}
