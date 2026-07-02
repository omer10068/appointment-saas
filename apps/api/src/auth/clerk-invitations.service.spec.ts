import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BUSINESS_INVITATION_EXPIRES_IN_DAYS,
  ClerkInvitationsService,
} from './clerk-invitations.service';

// ── Clerk SDK mock ─────────────────────────────────────────────────────────────
const mockCreateInvitation = jest.fn<
  () => Promise<{
    id: string;
    emailAddress: string;
    status: string;
    publicMetadata: Record<string, unknown> | null;
  }>
>();

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({
    invitations: {
      createInvitation: mockCreateInvitation,
    },
  })),
}));

const mockConfigService = {
  getOrThrow: jest.fn<() => string>().mockReturnValue('sk_test_key'),
};

describe('ClerkInvitationsService', () => {
  let service: ClerkInvitationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2024-06-01T00:00:00.000Z'));
    mockConfigService.getOrThrow.mockReturnValue('sk_test_key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkInvitationsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ClerkInvitationsService>(ClerkInvitationsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createOwnerInvitation', () => {
    it('creates a Clerk invitation with the correct params', async () => {
      mockCreateInvitation.mockResolvedValueOnce({
        id: 'clerk_inv_123',
        emailAddress: 'owner@example.com',
        status: 'pending',
        publicMetadata: { businessInvitationId: 'biz-inv-1' },
      });

      const result = await service.createOwnerInvitation({
        email: 'owner@example.com',
        businessInvitationId: 'biz-inv-1',
      });

      expect(mockCreateInvitation).toHaveBeenCalledWith({
        emailAddress: 'owner@example.com',
        publicMetadata: { businessInvitationId: 'biz-inv-1' },
        expiresInDays: BUSINESS_INVITATION_EXPIRES_IN_DAYS,
        ignoreExisting: true,
        notify: true,
      });
      expect(result.clerkInvitationId).toBe('clerk_inv_123');
    });

    it('returns an expiresAt computed from BUSINESS_INVITATION_EXPIRES_IN_DAYS', async () => {
      mockCreateInvitation.mockResolvedValueOnce({
        id: 'clerk_inv_123',
        emailAddress: 'owner@example.com',
        status: 'pending',
        publicMetadata: null,
      });

      const result = await service.createOwnerInvitation({
        email: 'owner@example.com',
        businessInvitationId: 'biz-inv-1',
      });

      const expected = new Date(
        Date.now() + BUSINESS_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
      );
      expect(result.expiresAt).toEqual(expected);
    });

    it('throws BadGatewayException when Clerk rejects', async () => {
      mockCreateInvitation.mockRejectedValueOnce(new Error('Clerk 422'));

      await expect(
        service.createOwnerInvitation({
          email: 'owner@example.com',
          businessInvitationId: 'biz-inv-1',
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when Clerk returns a non-Error rejection', async () => {
      mockCreateInvitation.mockRejectedValueOnce('string error');

      await expect(
        service.createOwnerInvitation({
          email: 'owner@example.com',
          businessInvitationId: 'biz-inv-1',
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
