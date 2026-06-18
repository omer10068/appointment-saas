import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClerkProvisioningService } from './clerk-provisioning.service';

// ── Clerk SDK mock ─────────────────────────────────────────────────────────────
const mockGetUserList =
  jest.fn<() => Promise<{ data: { id: string }[]; totalCount: number }>>();
const mockCreateUser = jest.fn<() => Promise<{ id: string }>>();

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({
    users: {
      getUserList: mockGetUserList,
      createUser: mockCreateUser,
    },
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
const emptyList = { data: [], totalCount: 0 };
const listOf = (id: string) => ({ data: [{ id }], totalCount: 1 });

const mockConfigService = {
  getOrThrow: jest.fn<() => string>().mockReturnValue('sk_test_key'),
};

describe('ClerkProvisioningService', () => {
  let service: ClerkProvisioningService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('sk_test_key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkProvisioningService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ClerkProvisioningService>(ClerkProvisioningService);
  });

  // ── Email search ──────────────────────────────────────────────────────────

  describe('existing Clerk user found by email', () => {
    it('returns clerkUserId without calling createUser', async () => {
      mockGetUserList.mockResolvedValueOnce(listOf('clerk_email_match'));

      const result = await service.findOrCreateClerkUser({
        email: 'user@example.com',
      });

      expect(result).toEqual({ clerkUserId: 'clerk_email_match' });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('uses the first result when multiple Clerk users share the email', async () => {
      mockGetUserList.mockResolvedValueOnce({
        data: [{ id: 'clerk_first' }, { id: 'clerk_second' }],
        totalCount: 2,
      });

      const result = await service.findOrCreateClerkUser({
        email: 'user@example.com',
      });

      expect(result).toEqual({ clerkUserId: 'clerk_first' });
    });

    it('queries Clerk with the exact email provided', async () => {
      mockGetUserList.mockResolvedValueOnce(listOf('clerk_abc'));

      await service.findOrCreateClerkUser({ email: 'owner@mybiz.com' });

      expect(mockGetUserList).toHaveBeenCalledWith({
        emailAddress: ['owner@mybiz.com'],
      });
    });
  });

  // ── Create new Clerk user ─────────────────────────────────────────────────

  describe('no existing Clerk user — create by email', () => {
    it('creates Clerk user with emailAddress only (no phoneNumber)', async () => {
      mockGetUserList.mockResolvedValueOnce(emptyList);
      mockCreateUser.mockResolvedValueOnce({ id: 'clerk_created' });

      const result = await service.findOrCreateClerkUser({
        email: 'user@example.com',
      });

      expect(result).toEqual({ clerkUserId: 'clerk_created' });
      expect(mockCreateUser).toHaveBeenCalledWith({
        emailAddress: ['user@example.com'],
        skipPasswordRequirement: true,
      });
      // Phone must NOT be included in Clerk user creation
      const callArgs = mockCreateUser.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArgs).not.toHaveProperty('phoneNumber');
    });

    it('returns the new clerkUserId', async () => {
      mockGetUserList.mockResolvedValueOnce(emptyList);
      mockCreateUser.mockResolvedValueOnce({ id: 'new_clerk_id_xyz' });

      const result = await service.findOrCreateClerkUser({
        email: 'manager@biz.com',
      });

      expect(result.clerkUserId).toBe('new_clerk_id_xyz');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('Clerk API errors', () => {
    it('throws BadGatewayException when getUserList rejects', async () => {
      mockGetUserList.mockRejectedValueOnce(new Error('Clerk network error'));

      await expect(
        service.findOrCreateClerkUser({ email: 'user@example.com' }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when createUser rejects', async () => {
      mockGetUserList.mockResolvedValueOnce(emptyList);
      mockCreateUser.mockRejectedValueOnce(new Error('Clerk 422'));

      await expect(
        service.findOrCreateClerkUser({ email: 'user@example.com' }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when Clerk returns a non-Error rejection', async () => {
      mockGetUserList.mockRejectedValueOnce('string error');

      await expect(
        service.findOrCreateClerkUser({ email: 'user@example.com' }),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
