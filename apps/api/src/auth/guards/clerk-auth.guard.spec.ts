import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type User } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    clerkUserId: 'clerk_123',
    email: 'test@example.com',
    phoneNormalized: '+972501234567',
    phoneVerifiedAt: null,
    status: 'ACTIVE',
    platformRole: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

const mockPrisma = {
  user: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<User | null>>(),
    update: jest.fn<(...args: unknown[]) => Promise<User>>(),
    create: jest.fn<(...args: unknown[]) => Promise<User>>(),
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

function makeContextWithRequest(authHeader: string): {
  ctx: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = {
    headers: { authorization: authHeader },
  };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
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

  // ──────────────────────────────────────────────────────────────────────────
  // Header / token validation
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // Fast path: user already linked by clerkUserId
  // ──────────────────────────────────────────────────────────────────────────

  describe('user resolved by clerkUserId (fast path)', () => {
    it('attaches user to request and returns true', async () => {
      const user = makeUser();
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_123' });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const { ctx, request } = makeContextWithRequest('Bearer valid_token');
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect((request as unknown as { user: User }).user).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkUserId: 'clerk_123' },
      });
    });

    it('does not call getClerkUserData when resolved by clerkUserId', async () => {
      const user = makeUser();
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_123' });
      const dataSpy = jest.spyOn(guard as any, 'getClerkUserData');
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const { ctx } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(dataSpy).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Slow path scenario 1: phone-first invited user linking
  // ──────────────────────────────────────────────────────────────────────────

  describe('invited user linking by phone (first login)', () => {
    it('updates clerkUserId and changes status INVITED → ACTIVE', async () => {
      const invited = makeUser({
        id: 'invited-id',
        clerkUserId: null,
        status: 'INVITED',
      });
      const linked = makeUser({
        id: 'invited-id',
        clerkUserId: 'new_clerk_id',
        status: 'ACTIVE',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'new_clerk_id' });
      jest.spyOn(guard as any, 'getClerkUserData').mockResolvedValue({
        phone: '050-123-4567',
        email: 'invited@example.com',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // by clerkUserId → miss
        .mockResolvedValueOnce(invited); // by phoneNormalized → invited user
      mockPrisma.user.update.mockResolvedValue(linked);

      const { ctx, request } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'invited-id' },
        data: { clerkUserId: 'new_clerk_id', status: 'ACTIVE' },
      });
      expect((request as unknown as { user: User }).user.id).toBe('invited-id');
      expect((request as unknown as { user: User }).user.status).toBe('ACTIVE');
    });

    it('preserves the original internal user id after phone linking', async () => {
      const invited = makeUser({
        id: 'original-invited-id',
        clerkUserId: null,
        status: 'INVITED',
      });
      const linked = makeUser({
        id: 'original-invited-id',
        clerkUserId: 'new_clerk_id',
        status: 'ACTIVE',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'new_clerk_id' });
      jest
        .spyOn(guard as any, 'getClerkUserData')
        .mockResolvedValue({ phone: '050-123-4567', email: null });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(invited);
      mockPrisma.user.update.mockResolvedValue(linked);

      const { ctx, request } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect((request as unknown as { user: User }).user.id).toBe(
        'original-invited-id',
      );
    });

    it('returns businesses assigned before login via BusinessUser (regression)', async () => {
      const invited = makeUser({
        id: 'abd30f9b-9a1e-4dac-af0e-2e851a246645',
        clerkUserId: null,
        status: 'INVITED',
      });
      const linked = makeUser({
        id: 'abd30f9b-9a1e-4dac-af0e-2e851a246645',
        clerkUserId: 'user_clerk_real_id',
        status: 'ACTIVE',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'user_clerk_real_id' });
      jest.spyOn(guard as any, 'getClerkUserData').mockResolvedValue({
        phone: '050-123-4567',
        email: 'owner+clerk_test@example.com',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(invited);
      mockPrisma.user.update.mockResolvedValue(linked);

      const { ctx, request } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect((request as unknown as { user: User }).user.id).toBe(
        'abd30f9b-9a1e-4dac-af0e-2e851a246645',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Slow path scenario 2: email fallback linking
  // ──────────────────────────────────────────────────────────────────────────

  describe('invited user linking by email fallback', () => {
    it('links invited user when phone not in DB but email matches', async () => {
      const invited = makeUser({
        id: 'invited-id',
        clerkUserId: null,
        email: 'owner@example.com',
        status: 'INVITED',
      });
      const linked = makeUser({
        id: 'invited-id',
        clerkUserId: 'clerk_id',
        status: 'ACTIVE',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_id' });
      jest.spyOn(guard as any, 'getClerkUserData').mockResolvedValue({
        phone: '050-123-4567',
        email: 'OWNER@EXAMPLE.COM',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // by clerkUserId → miss
        .mockResolvedValueOnce(null) // by phoneNormalized → miss
        .mockResolvedValueOnce(invited); // by email → hit
      mockPrisma.user.update.mockResolvedValue(linked);

      const { ctx } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(3, {
        where: { email: 'owner@example.com' },
      });
    });

    it('normalizes Clerk email to lowercase before looking up in DB', async () => {
      const invited = makeUser({
        id: 'invited-id',
        clerkUserId: null,
        email: 'owner@example.com',
        status: 'INVITED',
      });
      const linked = makeUser({
        id: 'invited-id',
        clerkUserId: 'clerk_id',
        status: 'ACTIVE',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_id' });
      jest.spyOn(guard as any, 'getClerkUserData').mockResolvedValue({
        phone: '050-123-4567',
        email: 'OWNER@EXAMPLE.COM',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(invited);
      mockPrisma.user.update.mockResolvedValue(linked);

      const { ctx } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(3, {
        where: { email: 'owner@example.com' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Slow path scenario 3: phone already claimed by different Clerk account
  // ──────────────────────────────────────────────────────────────────────────

  describe('phone already linked to a different Clerk account', () => {
    it('throws UnauthorizedException and does not override existing clerkUserId', async () => {
      const existing = makeUser({
        clerkUserId: 'original_clerk_id',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'attacker_clerk_id' });
      jest.spyOn(guard as any, 'getClerkUserData').mockResolvedValue({
        phone: '050-123-4567',
        email: 'shared@example.com',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // by clerkUserId → miss
        .mockResolvedValueOnce(existing); // by phoneNormalized → found with different clerkUserId

      await expect(
        guard.canActivate(makeContext('Bearer valid_token')),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Slow path scenario 4: brand new Clerk user
  // ──────────────────────────────────────────────────────────────────────────

  describe('new Clerk user with no matching internal user', () => {
    it('creates a new internal user with status ACTIVE and platformRole USER', async () => {
      const newUser = makeUser({
        id: 'new-user-id',
        email: 'new@example.com',
        phoneNormalized: '+972509999999',
        clerkUserId: 'brand_new_clerk_id',
        status: 'ACTIVE',
        platformRole: 'USER',
      });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'brand_new_clerk_id' });
      jest
        .spyOn(guard as any, 'getClerkUserData')
        .mockResolvedValue({ phone: '050-9999999', email: 'new@example.com' });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // by clerkUserId
        .mockResolvedValueOnce(null) // by phoneNormalized
        .mockResolvedValueOnce(null); // by email
      mockPrisma.user.create.mockResolvedValue(newUser);

      const { ctx, request } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          phoneNormalized: '+972509999999',
          clerkUserId: 'brand_new_clerk_id',
          platformRole: 'USER',
          status: 'ACTIVE',
        },
      });
      expect((request as unknown as { user: User }).user).toEqual(newUser);
    });

    it('does not create a duplicate user if Clerk phone is already linked', async () => {
      const existing = makeUser({ clerkUserId: 'same_clerk_id' });

      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'same_clerk_id' });
      mockPrisma.user.findUnique.mockResolvedValue(existing);

      const { ctx } = makeContextWithRequest('Bearer valid_token');
      await guard.canActivate(ctx);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge cases: Clerk data unavailable or phone missing
  // ──────────────────────────────────────────────────────────────────────────

  describe('Clerk phone unavailable', () => {
    it('throws UnauthorizedException when getClerkUserData rejects', async () => {
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_id' });
      jest
        .spyOn(guard as any, 'getClerkUserData')
        .mockRejectedValue(new Error('Clerk API error'));
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        guard.canActivate(makeContext('Bearer valid_token')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when primary phone is null', async () => {
      jest
        .spyOn(guard as any, 'verifyClerkToken')
        .mockResolvedValue({ sub: 'clerk_id' });
      jest
        .spyOn(guard as any, 'getClerkUserData')
        .mockResolvedValue({ phone: null, email: null });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        guard.canActivate(makeContext('Bearer valid_token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
