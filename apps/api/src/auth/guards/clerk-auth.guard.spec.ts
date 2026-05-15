import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type User } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

const mockUser: User = {
  id: 'user-1',
  clerkUserId: 'clerk_user_123',
  email: 'test@example.com',
  phone: null,
  status: 'ACTIVE',
  platformRole: 'USER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn<() => Promise<User | null>>(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn<() => string>(),
};

function makeContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('sk_test_key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkAuthGuard,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<ClerkAuthGuard>(ClerkAuthGuard);
  });

  describe('missing Authorization header', () => {
    it('throws UnauthorizedException', async () => {
      await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('malformed Authorization header', () => {
    it('throws UnauthorizedException when not a Bearer token', async () => {
      await expect(
        guard.canActivate(makeContext('Basic dXNlcjpwYXNz')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Bearer has empty token', async () => {
      await expect(guard.canActivate(makeContext('Bearer '))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('invalid token', () => {
    it('throws UnauthorizedException when Clerk verification fails', async () => {
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockRejectedValue(new Error('Token invalid'));

      await expect(
        guard.canActivate(makeContext('Bearer bad_token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('valid token with existing internal user', () => {
    it('attaches user to request and returns true', async () => {
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_user_123' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = { headers: { authorization: 'Bearer valid_token' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect((request as unknown as { user: User }).user).toEqual(mockUser);
    });
  });

  describe('valid token with no internal user', () => {
    it('throws UnauthorizedException when user not found in database', async () => {
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_user_unknown' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        guard.canActivate(makeContext('Bearer valid_token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
