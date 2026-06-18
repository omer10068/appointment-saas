import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { PlatformRole, User, UserStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { normalizePhone } from '../../dashboard/phone.util';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException();
    }

    const secretKey = this.configService.getOrThrow<string>('CLERK_SECRET_KEY');

    const payload = await this.verifyClerkToken(token, secretKey).catch(() => {
      throw new UnauthorizedException();
    });

    request.user = await this.resolveUser(payload.sub, secretKey);
    return true;
  }

  private async resolveUser(
    clerkUserId: string,
    secretKey: string,
  ): Promise<User> {
    this.logger.debug(`resolveUser clerkUserId=${clerkUserId}`);

    // Fast path: already linked — existing users work without re-fetching Clerk data
    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });
    if (byClerkId) {
      this.logger.debug(
        `resolved by clerkUserId internalId=${byClerkId.id} status=${byClerkId.status}`,
      );
      return byClerkId;
    }

    // Slow path: first login — fetch full Clerk user data (email + optional phone).
    // Business-side users (OWNER/MANAGER/MEMBER/admin) authenticate by email only.
    // Clerk phone/SMS is not used; Israeli numbers are not supported in our Clerk setup.
    this.logger.debug(
      `no user by clerkUserId=${clerkUserId}, fetching Clerk user data`,
    );

    const clerkData = await this.getClerkUserData(clerkUserId, secretKey).catch(
      () => {
        throw new UnauthorizedException();
      },
    );

    const email = clerkData.email?.toLowerCase() ?? null;

    // Normalize phone only if Clerk provides one (legacy path for older accounts /
    // platform admins that may still have a Clerk phone on file).
    // Phone is NOT sent to Clerk during admin provisioning and is NOT required here.
    let phoneNormalized: string | null = null;
    if (clerkData.phone) {
      try {
        phoneNormalized = normalizePhone(clerkData.phone);
      } catch {
        this.logger.warn(
          `clerkUserId=${clerkUserId} phone "${clerkData.phone}" could not be normalized — skipping phone lookup`,
        );
      }
    }

    // Try to find existing User by phone (legacy path for invited users linked by phone)
    if (phoneNormalized) {
      const byPhone = await this.prisma.user.findUnique({
        where: { phoneNormalized },
      });

      if (byPhone) {
        if (byPhone.clerkUserId !== null) {
          this.logger.warn(
            `phoneNormalized ${phoneNormalized} already linked to a different clerkUserId`,
          );
          throw new UnauthorizedException();
        }
        // Link invited user by phone: preserve id + BusinessUser assignments
        this.logger.debug(
          `linking user by phone internalId=${byPhone.id} → ACTIVE`,
        );
        return this.prisma.user.update({
          where: { id: byPhone.id },
          data: { clerkUserId, status: UserStatus.ACTIVE },
        });
      }
    }

    // Try to find existing User by email (primary path for email-only business users).
    // Admin-provisioned users (Phase D) have email set and clerkUserId pre-linked, so
    // this path handles the edge case where clerkUserId was cleared or DB was re-seeded.
    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.clerkUserId !== null) {
          this.logger.warn(
            `email ${email} already linked to a different clerkUserId`,
          );
          throw new UnauthorizedException();
        }
        this.logger.debug(
          `linking user by email internalId=${byEmail.id} status=${byEmail.status} → ACTIVE`,
        );
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            clerkUserId,
            status: UserStatus.ACTIVE,
            // Only update phoneNormalized if Clerk provided a phone (legacy accounts)
            ...(phoneNormalized ? { phoneNormalized } : {}),
          },
        });
      }
    }

    // No existing internal user found by phone or email.
    if (phoneNormalized) {
      // Legacy: create a new internal User for Clerk accounts that carry a phone.
      // Preserves existing create behavior for platform admin or pre-provisioning accounts.
      this.logger.debug(
        `creating new user clerkUserId=${clerkUserId} phone=${phoneNormalized}`,
      );
      return this.prisma.user.create({
        data: {
          email,
          phoneNormalized,
          clerkUserId,
          platformRole: PlatformRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
    }

    // Email-only Clerk user with no matching internal account — reject.
    // All business users must be provisioned by an admin via POST /admin/businesses/:id/owner
    // or POST /admin/businesses/:id/users before their first login.
    this.logger.warn(
      `clerkUserId=${clerkUserId} has no matching internal user ` +
        `(email=${email ?? 'none'}) — user must be provisioned by admin first`,
    );
    throw new UnauthorizedException();
  }

  protected verifyClerkToken(
    token: string,
    secretKey: string,
  ): Promise<{ sub: string }> {
    return verifyToken(token, { secretKey });
  }

  protected async getClerkUserData(
    clerkUserId: string,
    secretKey: string,
  ): Promise<{ email: string | null; phone: string | null }> {
    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(clerkUserId);

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? null;

    // Prefer verified primary phone; fall back to any verified phone
    // TODO: in production, only use phoneNumbers with verification.status === 'verified'
    const primaryPhone =
      clerkUser.phoneNumbers.find(
        (p) => p.id === clerkUser.primaryPhoneNumberId,
      )?.phoneNumber ??
      clerkUser.phoneNumbers[0]?.phoneNumber ??
      null;

    return { email: primaryEmail, phone: primaryPhone };
  }
}
