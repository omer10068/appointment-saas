import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkWebhookService } from './clerk-webhook.service';

const RAW_BODY = Buffer.from('{}');
const SVIX_HEADERS = {
  svixId: 'msg_123',
  svixTimestamp: '1234567890',
  svixSignature: 'v1,abc123',
};

function makeUserCreatedEvent(
  clerkUserId: string,
  email: string,
  primaryEmailId = 'email_1',
) {
  return {
    type: 'user.created',
    data: {
      id: clerkUserId,
      email_addresses: [{ id: primaryEmailId, email_address: email }],
      primary_email_address_id: primaryEmailId,
    },
  };
}

const mockPrisma = {
  user: {
    findUnique: jest.fn<() => Promise<User | null>>(),
    update: jest.fn<() => Promise<User>>(),
    create: jest.fn<() => Promise<User>>(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn<() => string>().mockReturnValue('whsec_test'),
};

describe('ClerkWebhookService', () => {
  let service: ClerkWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('whsec_test');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkWebhookService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClerkWebhookService>(ClerkWebhookService);
  });

  function spyVerify(event: ReturnType<typeof makeUserCreatedEvent>) {
    jest.spyOn(service as any, 'verifyWebhook').mockReturnValue(event);
  }

  describe('unsupported event type', () => {
    it('returns without touching the database', async () => {
      jest.spyOn(service as any, 'verifyWebhook').mockReturnValue({
        type: 'session.created',
        data: {},
      });

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('invalid webhook signature', () => {
    it('throws UnauthorizedException when verifyWebhook fails', async () => {
      jest.spyOn(service as any, 'verifyWebhook').mockImplementation(() => {
        throw new UnauthorizedException('Invalid webhook signature');
      });

      await expect(
        service.handleEvent(
          RAW_BODY,
          SVIX_HEADERS.svixId,
          SVIX_HEADERS.svixTimestamp,
          SVIX_HEADERS.svixSignature,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('user.created — no existing user', () => {
    it('creates a new internal user with status ACTIVE and platformRole USER', async () => {
      spyVerify(makeUserCreatedEvent('clerk_new', 'new@example.com'));
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({} as User);

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          clerkUserId: 'clerk_new',
          email: 'new@example.com',
          status: 'ACTIVE',
          platformRole: 'USER',
        },
      });

      const createCall = (mockPrisma.user.create as jest.Mock).mock
        .calls[0][0] as { data: { platformRole: string } };
      expect(createCall.data.platformRole).not.toBe('ADMIN');
      expect(createCall.data.platformRole).not.toBe('SUPER_ADMIN');
    });
  });

  describe('user.created — invited user exists by email', () => {
    it('links clerkUserId and sets status ACTIVE on the existing user', async () => {
      const existingUser: User = {
        id: 'user-invited',
        clerkUserId: null,
        email: 'owner@example.com',
        phone: null,
        status: 'INVITED',
        platformRole: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      spyVerify(makeUserCreatedEvent('clerk_owner', 'owner@example.com'));

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // byClerkId
        .mockResolvedValueOnce(existingUser); // byEmail

      mockPrisma.user.update.mockResolvedValue({} as User);

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-invited' },
        data: { clerkUserId: 'clerk_owner', status: 'ACTIVE' },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('user.updated — user already linked by clerkUserId', () => {
    it('updates email when it has changed', async () => {
      const existingUser: User = {
        id: 'user-linked',
        clerkUserId: 'clerk_existing',
        email: 'old@example.com',
        phone: null,
        status: 'ACTIVE',
        platformRole: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'verifyWebhook').mockReturnValue({
        type: 'user.updated',
        data: {
          id: 'clerk_existing',
          email_addresses: [
            { id: 'email_1', email_address: 'new@example.com' },
          ],
          primary_email_address_id: 'email_1',
        },
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.user.update.mockResolvedValue({} as User);

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-linked' },
        data: { email: 'new@example.com' },
      });
    });

    it('skips update when email is unchanged', async () => {
      const existingUser: User = {
        id: 'user-linked',
        clerkUserId: 'clerk_existing',
        email: 'same@example.com',
        phone: null,
        status: 'ACTIVE',
        platformRole: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'verifyWebhook').mockReturnValue({
        type: 'user.updated',
        data: {
          id: 'clerk_existing',
          email_addresses: [
            { id: 'email_1', email_address: 'same@example.com' },
          ],
          primary_email_address_id: 'email_1',
        },
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('missing primary email', () => {
    it('throws BadRequestException when primary_email_address_id has no match', async () => {
      jest.spyOn(service as any, 'verifyWebhook').mockReturnValue({
        type: 'user.created',
        data: {
          id: 'clerk_noemail',
          email_addresses: [
            { id: 'email_other', email_address: 'other@example.com' },
          ],
          primary_email_address_id: 'email_missing',
        },
      });

      await expect(
        service.handleEvent(
          RAW_BODY,
          SVIX_HEADERS.svixId,
          SVIX_HEADERS.svixTimestamp,
          SVIX_HEADERS.svixSignature,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
