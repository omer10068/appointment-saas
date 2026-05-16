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

    // Fast path: already linked
    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (byClerkId) {
      this.logger.debug(
        `resolved by clerkUserId internalId=${byClerkId.id} status=${byClerkId.status}`,
      );
      return byClerkId;
    }

    // Slow path: first login — resolve by primary email from Clerk
    this.logger.debug(
      `no user by clerkUserId=${clerkUserId}, resolving by email`,
    );

    const rawEmail = await this.getClerkUserEmail(clerkUserId, secretKey).catch(
      () => {
        throw new UnauthorizedException();
      },
    );

    if (!rawEmail) {
      this.logger.warn(`no primary email for clerkUserId=${clerkUserId}`);
      throw new UnauthorizedException();
    }

    const email = rawEmail.toLowerCase();
    this.logger.debug(`email=${email} for clerkUserId=${clerkUserId}`);

    const byEmail = await this.prisma.user.findUnique({ where: { email } });

    if (byEmail) {
      if (byEmail.clerkUserId !== null) {
        // Email already claimed by a different Clerk account — reject silently
        this.logger.warn(
          `email ${email} already linked to a different clerkUserId`,
        );
        throw new UnauthorizedException();
      }

      // Link invited user: preserve id + BusinessUser assignments, activate account
      this.logger.debug(
        `linking invited user internalId=${byEmail.id} status=${byEmail.status} → ACTIVE`,
      );
      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { clerkUserId, status: 'ACTIVE' },
      });
      this.logger.debug(
        `linked internalId=${linked.id} clerkUserId=${linked.clerkUserId} status=${linked.status}`,
      );
      return linked;
    }

    // No internal user at all — create a new one
    this.logger.debug(
      `creating new user email=${email} clerkUserId=${clerkUserId}`,
    );
    const created = await this.prisma.user.create({
      data: { email, clerkUserId, platformRole: 'USER', status: 'ACTIVE' },
    });
    this.logger.debug(`created internalId=${created.id}`);
    return created;
  }

  protected verifyClerkToken(
    token: string,
    secretKey: string,
  ): Promise<{ sub: string }> {
    return verifyToken(token, { secretKey });
  }

  protected async getClerkUserEmail(
    clerkUserId: string,
    secretKey: string,
  ): Promise<string | null> {
    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const primary = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    return primary?.emailAddress ?? null;
  }
}
