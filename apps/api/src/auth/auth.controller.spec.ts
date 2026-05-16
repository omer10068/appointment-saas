import { beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { type User } from '../generated/prisma/client';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request';
import { AuthController } from './auth.controller';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    clerkUserId: 'clerk_123',
    email: 'test@example.com',
    phone: null,
    status: 'ACTIVE',
    platformRole: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('GET /auth/me', () => {
    it('returns id, email, platformRole, status for a regular user', () => {
      const user = makeUser();
      const req = { user } as unknown as AuthenticatedRequest;

      const result = controller.getMe(req);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        platformRole: 'USER',
        status: 'ACTIVE',
      });
    });

    it('returns SUPER_ADMIN platformRole for a super admin', () => {
      const user = makeUser({ platformRole: 'SUPER_ADMIN' });
      const req = { user } as unknown as AuthenticatedRequest;

      const result = controller.getMe(req);

      expect(result.platformRole).toBe('SUPER_ADMIN');
    });

    it('does not leak clerkUserId or other internal fields', () => {
      const user = makeUser();
      const req = { user } as unknown as AuthenticatedRequest;

      const result = controller.getMe(req);

      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });
  });
});
