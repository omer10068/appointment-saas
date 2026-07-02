import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  Business,
  BusinessInvitation,
  BusinessUser,
  User,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkInvitationsService } from '../auth/clerk-invitations.service';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { BusinessUsersService } from './business-users.service';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'generated-invitation-id'),
}));

const NOW = new Date('2024-06-01T00:00:00.000Z');
const FUTURE = new Date('2024-06-08T00:00:00.000Z');
const PAST = new Date('2024-05-01T00:00:00.000Z');

const mockBusiness: Business = {
  id: 'biz-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  status: 'TRIAL',
  timezone: 'Asia/Jerusalem',
  locale: 'he-IL',
  currency: 'ILS',
  publicBookingEnabled: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUser: User = {
  id: 'user-1',
  email: 'owner@example.com',
  phoneNormalized: '+972501111111',
  phoneVerifiedAt: null,
  clerkUserId: null,
  status: 'INVITED',
  platformRole: 'USER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBusinessUser: BusinessUser = {
  id: 'bu-1',
  businessId: 'biz-1',
  userId: 'user-1',
  role: 'OWNER',
  status: 'INVITED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeInvitation(
  overrides: Partial<BusinessInvitation> = {},
): BusinessInvitation {
  return {
    id: 'inv-1',
    businessId: 'biz-1',
    businessUserId: 'bu-1',
    email: 'owner@example.com',
    status: 'PENDING',
    clerkInvitationId: 'clerk_inv_1',
    invitedByUserId: 'admin-1',
    expiresAt: FUTURE,
    clerkSendAttemptedAt: NOW,
    acceptedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

type BusinessUserWithInvitation = BusinessUser & {
  businessInvitation: BusinessInvitation | null;
};

const mockTx = {
  businessUser: {
    findFirst:
      jest.fn<
        (...args: unknown[]) => Promise<BusinessUserWithInvitation | null>
      >(),
    create: jest.fn<(...args: unknown[]) => Promise<BusinessUser>>(),
  },
  user: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<User | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<User>>(),
  },
  businessInvitation: {
    upsert: jest.fn<(...args: unknown[]) => Promise<BusinessInvitation>>(),
  },
};

const mockPrisma = {
  business: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<Business | null>>(),
  },
  businessInvitation: {
    update: jest.fn<(...args: unknown[]) => Promise<BusinessInvitation>>(),
  },
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

const mockClerkInvitations = {
  createOwnerInvitation: jest
    .fn<
      (dto: {
        email: string;
        businessInvitationId: string;
      }) => Promise<{ clerkInvitationId: string; expiresAt: Date }>
    >()
    .mockResolvedValue({
      clerkInvitationId: 'clerk_inv_new',
      expiresAt: FUTURE,
    }),
};

describe('BusinessUsersService', () => {
  let service: BusinessUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    mockPrisma.$transaction.mockImplementation((...args: unknown[]) => {
      const fn = args[0] as (tx: typeof mockTx) => Promise<unknown>;
      return fn(mockTx);
    });
    mockPrisma.businessInvitation.update.mockResolvedValue(makeInvitation());

    mockClerkInvitations.createOwnerInvitation.mockResolvedValue({
      clerkInvitationId: 'clerk_inv_new',
      expiresAt: FUTURE,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessUsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClerkInvitationsService, useValue: mockClerkInvitations },
      ],
    }).compile();

    service = module.get<BusinessUsersService>(BusinessUsersService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createOwnerForBusiness', () => {
    const dto: CreateBusinessOwnerDto = {
      phone: '050-1111111',
      email: 'owner@example.com',
    };

    function seedFreshHappyPath() {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValue(null);
      mockTx.user.create.mockResolvedValue(mockUser);
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);
      mockTx.businessInvitation.upsert.mockResolvedValue(makeInvitation());
    }

    describe('persist-first ordering', () => {
      it('persists User/BusinessUser (INVITED)/BusinessInvitation (PENDING, no clerkInvitationId) before calling Clerk', async () => {
        seedFreshHappyPath();

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockTx.user.create).toHaveBeenCalledWith({
          data: {
            phoneNormalized: '+972501111111',
            email: 'owner@example.com',
            status: 'INVITED',
          },
        });
        expect(mockTx.businessUser.create).toHaveBeenCalledWith({
          data: {
            businessId: 'biz-1',
            userId: mockUser.id,
            role: 'OWNER',
            status: 'INVITED',
          },
        });
        expect(mockTx.businessInvitation.upsert).toHaveBeenCalledWith({
          where: { id: 'generated-invitation-id' },
          create: {
            id: 'generated-invitation-id',
            businessId: 'biz-1',
            businessUserId: mockBusinessUser.id,
            email: 'owner@example.com',
            status: 'PENDING',
            clerkInvitationId: null,
            clerkSendAttemptedAt: null,
            expiresAt: null,
            invitedByUserId: 'admin-1',
          },
          update: {
            status: 'PENDING',
            clerkInvitationId: null,
            clerkSendAttemptedAt: null,
            expiresAt: null,
            acceptedAt: null,
          },
        });
      });

      it('runs the persist transaction with Serializable isolation', async () => {
        seedFreshHappyPath();

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockPrisma.$transaction).toHaveBeenCalledWith(
          expect.any(Function),
          { isolationLevel: 'Serializable' },
        );
      });

      it('calls the persist transaction strictly before calling Clerk (order proof)', async () => {
        seedFreshHappyPath();

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        const txOrder = mockPrisma.$transaction.mock.invocationCallOrder[0];
        const clerkOrder =
          mockClerkInvitations.createOwnerInvitation.mock
            .invocationCallOrder[0];
        expect(txOrder).toBeLessThan(clerkOrder);
      });

      it('marks clerkSendAttemptedAt before calling Clerk, then confirms clerkInvitationId/expiresAt after', async () => {
        seedFreshHappyPath();

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockPrisma.businessInvitation.update).toHaveBeenNthCalledWith(
          1,
          {
            where: { id: 'generated-invitation-id' },
            data: { clerkSendAttemptedAt: NOW },
          },
        );
        expect(mockPrisma.businessInvitation.update).toHaveBeenNthCalledWith(
          2,
          {
            where: { id: 'generated-invitation-id' },
            data: { clerkInvitationId: 'clerk_inv_new', expiresAt: FUTURE },
          },
        );
      });

      it('database failure before the Clerk call means Clerk is never called', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue(null);
        mockTx.user.findUnique.mockResolvedValue(null);
        mockTx.user.create.mockRejectedValue(new Error('DB connection lost'));

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow('DB connection lost');

        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
        expect(mockPrisma.businessInvitation.update).not.toHaveBeenCalled();
      });

      it('Clerk failure after internal persistence leaves a deterministic retryable state and propagates the error', async () => {
        seedFreshHappyPath();
        mockClerkInvitations.createOwnerInvitation.mockRejectedValueOnce(
          new Error('Clerk API unavailable'),
        );

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow('Clerk API unavailable');

        // The "mark attempted" write happened, but no confirm write did.
        expect(mockPrisma.businessInvitation.update).toHaveBeenCalledTimes(1);
        expect(mockPrisma.businessInvitation.update).toHaveBeenCalledWith({
          where: { id: 'generated-invitation-id' },
          data: { clerkSendAttemptedAt: NOW },
        });
      });

      it('retrying after a Clerk failure reuses the same BusinessInvitation id', async () => {
        const unconfirmedInvitation = makeInvitation({
          id: 'existing-inv-id',
          clerkInvitationId: null,
          expiresAt: null,
        });
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue({
          ...mockBusinessUser,
          businessInvitation: unconfirmedInvitation,
        });
        mockTx.user.findUnique.mockResolvedValue(mockUser);
        mockTx.businessInvitation.upsert.mockResolvedValue(
          unconfirmedInvitation,
        );

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockTx.businessUser.create).not.toHaveBeenCalled();
        expect(mockClerkInvitations.createOwnerInvitation).toHaveBeenCalledWith(
          {
            email: 'owner@example.com',
            businessInvitationId: 'existing-inv-id',
          },
        );
      });

      it('retrying while a still-valid pending invitation exists throws Conflict and never calls Clerk (no duplicate live invitation)', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue({
          ...mockBusinessUser,
          businessInvitation: makeInvitation({ expiresAt: FUTURE }),
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(ConflictException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });

      it('retries using the same BusinessInvitation id when the prior invitation expired', async () => {
        const staleInvitation = makeInvitation({
          id: 'existing-inv-id',
          expiresAt: PAST,
        });
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue({
          ...mockBusinessUser,
          businessInvitation: staleInvitation,
        });
        mockTx.user.findUnique.mockResolvedValue(mockUser);
        mockTx.businessInvitation.upsert.mockResolvedValue(staleInvitation);

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockClerkInvitations.createOwnerInvitation).toHaveBeenCalledWith(
          {
            email: 'owner@example.com',
            businessInvitationId: 'existing-inv-id',
          },
        );
      });

      it('concurrent owner-invite attempts do not create duplicate active OWNER memberships (Serializable conflict → Conflict)', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockPrisma.$transaction.mockRejectedValueOnce({
          code: 'P2034',
          message:
            'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(ConflictException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });

      it('translates a P2028 transaction-API error the same way as P2034', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockPrisma.$transaction.mockRejectedValueOnce({
          code: 'P2028',
          message: 'Transaction API error',
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(ConflictException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });

      it('rethrows an unrelated transaction error unchanged (not silently converted to Conflict)', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockPrisma.$transaction.mockRejectedValueOnce({
          code: 'P2025',
          message: 'Record not found',
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.not.toThrow(ConflictException);
      });
    });

    describe('existing Clerk user behavior', () => {
      it('an existing internal user without a linked clerkUserId can be invited safely', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue(null);
        mockTx.user.findUnique.mockResolvedValueOnce({
          ...mockUser,
          clerkUserId: null,
        });
        mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);
        mockTx.businessInvitation.upsert.mockResolvedValue(makeInvitation());

        await service.createOwnerForBusiness('biz-1', dto, 'admin-1');

        expect(mockTx.user.create).not.toHaveBeenCalled();
        expect(mockClerkInvitations.createOwnerInvitation).toHaveBeenCalled();
      });

      it('an already Clerk-linked user does not receive a silently unclaimable invitation — fails closed with Conflict before calling Clerk', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue(null);
        mockTx.user.findUnique.mockResolvedValueOnce({
          ...mockUser,
          clerkUserId: 'clerk_already_linked',
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(ConflictException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
        expect(mockTx.businessUser.create).not.toHaveBeenCalled();
        expect(mockTx.businessInvitation.upsert).not.toHaveBeenCalled();
      });
    });

    describe('basic validation and conflicts', () => {
      it('throws BadRequestException when phone is invalid', async () => {
        const badDto: CreateBusinessOwnerDto = {
          phone: 'not-a-phone',
          email: 'owner@example.com',
        };
        await expect(
          service.createOwnerForBusiness('biz-1', badDto, 'admin-1'),
        ).rejects.toThrow('Invalid phone number');
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });

      it('throws NotFoundException when business does not exist', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(null);

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(NotFoundException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });

      it('throws ConflictException when the business already has an ACTIVE owner', async () => {
        mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
        mockTx.businessUser.findFirst.mockResolvedValue({
          ...mockBusinessUser,
          status: 'ACTIVE',
          businessInvitation: null,
        });

        await expect(
          service.createOwnerForBusiness('biz-1', dto, 'admin-1'),
        ).rejects.toThrow(ConflictException);
        expect(
          mockClerkInvitations.createOwnerInvitation,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
