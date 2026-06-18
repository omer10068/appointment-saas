import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

export interface ProvisionedClerkUser {
  clerkUserId: string;
}

@Injectable()
export class ClerkProvisioningService {
  private readonly logger = new Logger(ClerkProvisioningService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Find an existing Clerk user by email, or create a new one.
   *
   * Email is the primary Clerk identifier for business users (OWNER/MANAGER/MEMBER).
   * Phone SMS auth is not used for Israeli business users.
   *
   * Throws BadGatewayException if the Clerk API fails.
   *
   * Idempotent on retry: if Clerk creation succeeds but the DB write fails, the
   * next call will find the orphaned Clerk user by email and return its ID.
   */
  async findOrCreateClerkUser(dto: {
    email: string;
  }): Promise<ProvisionedClerkUser> {
    const secretKey = this.configService.getOrThrow<string>('CLERK_SECRET_KEY');
    const clerk = createClerkClient({ secretKey });

    try {
      // Search by email first
      const byEmail = await clerk.users.getUserList({
        emailAddress: [dto.email],
      });
      if (byEmail.data.length > 0) {
        this.logger.debug(
          `ClerkProvisioning: found existing user by email id=${byEmail.data[0].id}`,
        );
        return { clerkUserId: byEmail.data[0].id };
      }

      // No existing Clerk user — create one
      this.logger.debug(
        `ClerkProvisioning: creating Clerk user email=${dto.email}`,
      );
      const created = await clerk.users.createUser({
        emailAddress: [dto.email],
        skipPasswordRequirement: true,
      });
      this.logger.debug(
        `ClerkProvisioning: created Clerk user id=${created.id}`,
      );
      return { clerkUserId: created.id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ClerkProvisioning: Clerk API error: ${message}`);
      throw new BadGatewayException('Clerk user provisioning failed');
    }
  }
}
