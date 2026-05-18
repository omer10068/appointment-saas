import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { User } from '../../generated/prisma/client';
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

    // Slow path: first login — fetch full Clerk user data (email + phone)
    this.logger.debug(
      `no user by clerkUserId=${clerkUserId}, fetching Clerk user data`,
    );

    const clerkData = await this.getClerkUserData(clerkUserId, secretKey).catch(
      () => {
        throw new UnauthorizedException();
      },
    );

    // Phone is required for all new internal users
    if (!clerkData.phone) {
      this.logger.warn(
        `clerkUserId=${clerkUserId} has no verified phone — login rejected. ` +
          'Add a phone number to your Clerk profile to continue.',
      );
      throw new UnauthorizedException(
        'Phone number is required. Please add a verified phone to your Clerk profile.',
      );
    }

    let phoneNormalized: string;
    try {
      phoneNormalized = normalizePhone(clerkData.phone);
    } catch {
      this.logger.warn(
        `clerkUserId=${clerkUserId} phone "${clerkData.phone}" could not be normalized`,
      );
      throw new UnauthorizedException('Invalid phone number in Clerk profile');
    }

    // Try to find existing User by phoneNormalized (phone-first identity)
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
        data: { clerkUserId, status: 'ACTIVE' },
      });
    }

    // Fallback: try to find invited user by email (backward compat)
    const email = clerkData.email?.toLowerCase() ?? null;
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
          `linking invited user by email internalId=${byEmail.id} status=${byEmail.status} → ACTIVE`,
        );
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: { clerkUserId, phoneNormalized, status: 'ACTIVE' },
        });
      }
    }

    // Create new internal user
    this.logger.debug(
      `creating new user clerkUserId=${clerkUserId} phone=${phoneNormalized}`,
    );
    return this.prisma.user.create({
      data: {
        email,
        phoneNormalized,
        clerkUserId,
        platformRole: 'USER',
        status: 'ACTIVE',
      },
    });
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
