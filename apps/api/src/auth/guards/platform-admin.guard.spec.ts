import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { type User } from '../../generated/prisma/client';
import { PlatformAdminGuard } from './platform-admin.guard';

function makeContext(user?: Partial<User>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    guard = new PlatformAdminGuard();
  });

  it('throws UnauthorizedException when request.user is missing', () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException for platformRole USER', () => {
    expect(() =>
      guard.canActivate(makeContext({ platformRole: 'USER' })),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for platformRole SUPPORT', () => {
    expect(() =>
      guard.canActivate(makeContext({ platformRole: 'SUPPORT' })),
    ).toThrow(ForbiddenException);
  });

  it('allows platformRole ADMIN', () => {
    expect(guard.canActivate(makeContext({ platformRole: 'ADMIN' }))).toBe(
      true,
    );
  });

  it('allows platformRole SUPER_ADMIN', () => {
    expect(
      guard.canActivate(makeContext({ platformRole: 'SUPER_ADMIN' })),
    ).toBe(true);
  });
});
