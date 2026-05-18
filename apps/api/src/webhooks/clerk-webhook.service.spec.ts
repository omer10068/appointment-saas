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

function makeUserEvent(
  type: 'user.created' | 'user.updated',
  clerkUserId: string,
  email: string,
  primaryEmailId = 'email_1',
  phone?: string,
  primaryPhoneId = 'phone_1',
) {
  return {
    type,
    data: {
      id: clerkUserId,
      email_addresses: [{ id: primaryEmailId, email_address: email }],
      primary_email_address_id: primaryEmailId,
      phone_numbers: phone ? [{ id: primaryPhoneId, phone_number: phone }] : [],
      primary_phone_number_id: phone ? primaryPhoneId : null,
    },
  };
}

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

  function spyVerify(event: ReturnType<typeof makeUserEvent>) {
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
      spyVerify(
        makeUserEvent(
          'user.created',
          'clerk_new',
          'new@example.com',
          'email_1',
          '050-123-4567',
        ),
      );
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // byClerkId
        .mockResolvedValueOnce(null) // byPhoneNormalized
        .mockResolvedValueOnce(null); // byEmail
      mockPrisma.user.create.mockResolvedValue(makeUser());

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
          phoneNormalized: '+972501234567',
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

  describe('user.created — invited user exists by phone', () => {
    it('links clerkUserId by phone and sets status ACTIVE', async () => {
      const invited = makeUser({
        id: 'user-invited',
        clerkUserId: null,
        phoneNormalized: '+972501234567',
        email: 'owner@example.com',
        status: 'INVITED',
      });

      spyVerify(
        makeUserEvent(
          'user.created',
          'clerk_owner',
          'owner@example.com',
          'email_1',
          '050-123-4567',
        ),
      );

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // byClerkId → miss
        .mockResolvedValueOnce(invited); // byPhone → hit
      mockPrisma.user.update.mockResolvedValue(makeUser());

      await service.handleEvent(
        RAW_BODY,
        SVIX_HEADERS.svixId,
        SVIX_HEADERS.svixTimestamp,
        SVIX_HEADERS.svixSignature,
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-invited' },
        data: {
          clerkUserId: 'clerk_owner',
          status: 'ACTIVE',
          email: 'owner@example.com',
        },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('user.created — invited user exists by email (no phone in event)', () => {
    it('links clerkUserId by email fallback and sets status ACTIVE', async () => {
      const invited = makeUser({
        id: 'user-invited',
        clerkUserId: null,
        email: 'owner@example.com',
        status: 'INVITED',
      });

      // Event has no phone — tests email fallback path
      spyVerify(
        makeUserEvent('user.created', 'clerk_owner', 'owner@example.com'),
      );

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // byClerkId → miss
        .mockResolvedValueOnce(invited); // byEmail → hit
      mockPrisma.user.update.mockResolvedValue(makeUser());

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
      const existingUser = makeUser({
        id: 'user-linked',
        clerkUserId: 'clerk_existing',
        email: 'old@example.com',
      });

      spyVerify(
        makeUserEvent('user.updated', 'clerk_existing', 'new@example.com'),
      );

      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.user.update.mockResolvedValue(makeUser());

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
      const existingUser = makeUser({
        id: 'user-linked',
        clerkUserId: 'clerk_existing',
        email: 'same@example.com',
      });

      spyVerify(
        makeUserEvent('user.updated', 'clerk_existing', 'same@example.com'),
      );

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

  describe('user.created — no phone and no existing user', () => {
    it('throws BadRequestException when event has no phone and user cannot be created', async () => {
      // No phone in event → cannot create new user
      spyVerify(
        makeUserEvent('user.created', 'clerk_nophone', 'nophone@example.com'),
      );
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // byClerkId
        .mockResolvedValueOnce(null); // byEmail

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
