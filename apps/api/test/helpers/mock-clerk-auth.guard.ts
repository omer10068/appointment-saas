import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../src/auth/types/authenticated-request';
import type { User } from '../../src/generated/prisma/client';

/**
 * Drop-in replacement for ClerkAuthGuard in e2e tests.
 *
 * Usage in a test file:
 *   .overrideGuard(ClerkAuthGuard).useClass(MockClerkAuthGuard)
 *
 * Then per test:
 *   MockClerkAuthGuard.currentUser = someSeededUser;   // authenticated
 *   MockClerkAuthGuard.currentUser = null;              // unauthenticated → 401
 *
 * Reset in beforeEach so each test starts with null (unauthenticated) by default.
 */
export class MockClerkAuthGuard implements CanActivate {
  static currentUser: User | null = null;

  canActivate(ctx: ExecutionContext): boolean {
    if (!MockClerkAuthGuard.currentUser) throw new UnauthorizedException();
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user =
      MockClerkAuthGuard.currentUser;
    return true;
  }
}
