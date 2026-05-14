import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
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

    const user = await this.prisma.user.findUnique({
      where: { clerkUserId: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }

  protected verifyClerkToken(
    token: string,
    secretKey: string,
  ): Promise<{ sub: string }> {
    return verifyToken(token, { secretKey });
  }
}
