import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type Business,
  type BusinessUser,
  type User,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkProvisioningService } from '../auth/clerk-provisioning.service';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { BusinessUsersService } from './business-users.service';

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
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTx = {
  business: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<Business | null>>(),
  },
  businessUser: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<BusinessUser>>(),
  },
  user: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<User | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<User>>(),
    update: jest.fn<(...args: unknown[]) => Promise<User>>(),
  },
};

// mockPrisma.user is used for pre-transaction Clerk idempotency lookups
const mockPrisma = {
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  user: {
    findUnique:
      jest.fn<
        (...args: unknown[]) => Promise<{ clerkUserId: string | null } | null>
      >(),
  },
};

const mockClerkProvisioning = {
  findOrCreateClerkUser: jest
    .fn<(dto: { email: string }) => Promise<{ clerkUserId: string }>>()
    .mockResolvedValue({ clerkUserId: 'clerk_provisioned' }),
};

describe('BusinessUsersService', () => {
  let service: BusinessUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((...args: unknown[]) => {
      const fn = args[0] as (tx: typeof mockTx) => Promise<unknown>;
      return fn(mockTx);
    });

    // Default: no pre-existing user by phone or email (Clerk provisioning proceeds)
    mockPrisma.user.findUnique.mockResolvedValue(null);

    // Default: Clerk provisioning returns a deterministic clerkUserId
    mockClerkProvisioning.findOrCreateClerkUser.mockResolvedValue({
      clerkUserId: 'clerk_provisioned',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessUsersService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ClerkProvisioningService,
          useValue: mockClerkProvisioning,
        },
      ],
    }).compile();

    service = module.get<BusinessUsersService>(BusinessUsersService);
  });

  describe('createOwnerForBusiness', () => {
    const dto: CreateBusinessOwnerDto = {
      phone: '050-1111111',
      email: 'owner@example.com',
    };

    it('creates a new user and ACTIVE owner membership when user does not exist', async () => {
      // Transaction lookups: no user by phone or email in DB
      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValue(null);
      mockTx.user.create.mockResolvedValue({
        ...mockUser,
        clerkUserId: 'clerk_provisioned',
        status: 'ACTIVE',
      });
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);

      const result = await service.createOwnerForBusiness('biz-1', dto);

      expect(mockClerkProvisioning.findOrCreateClerkUser).toHaveBeenCalledWith({
        email: 'owner@example.com',
      });
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: {
          phoneNormalized: '+972501111111',
          email: 'owner@example.com',
          clerkUserId: 'clerk_provisioned',
          status: 'ACTIVE',
        },
      });
      expect(mockTx.businessUser.create).toHaveBeenCalledWith({
        data: {
          businessId: 'biz-1',
          userId: mockUser.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
      expect(result).toEqual(mockBusinessUser);
    });

    it('reuses an existing user found by phone and updates clerkUserId', async () => {
      // Pre-tx: phone lookup returns existing user (no clerkUserId yet)
      mockPrisma.user.findUnique.mockResolvedValueOnce({ clerkUserId: null }); // by phone
      // → clerkUserId null → check email: null → Clerk provision called

      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      // In-transaction: user found by phone
      mockTx.user.findUnique.mockResolvedValueOnce(mockUser); // by phone
      mockTx.user.update.mockResolvedValue({
        ...mockUser,
        clerkUserId: 'clerk_provisioned',
        status: 'ACTIVE',
      });
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);

      const result = await service.createOwnerForBusiness('biz-1', dto);

      expect(mockTx.user.create).not.toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { clerkUserId: 'clerk_provisioned', status: 'ACTIVE' },
      });
      expect(mockTx.businessUser.create).toHaveBeenCalledWith({
        data: {
          businessId: 'biz-1',
          userId: mockUser.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
      expect(result).toEqual(mockBusinessUser);
    });

    it('skips Clerk provisioning when user already has clerkUserId', async () => {
      // Pre-tx: phone lookup returns user with existing clerkUserId
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        clerkUserId: 'already_linked',
      }); // by phone → has clerkUserId → skip Clerk

      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        clerkUserId: 'already_linked',
      });
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);

      await service.createOwnerForBusiness('biz-1', dto);

      expect(
        mockClerkProvisioning.findOrCreateClerkUser,
      ).not.toHaveBeenCalled();
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when phone is invalid', async () => {
      const badDto: CreateBusinessOwnerDto = {
        phone: 'not-a-phone',
        email: 'owner@example.com',
      };
      await expect(
        service.createOwnerForBusiness('biz-1', badDto),
      ).rejects.toThrow('Invalid phone number');
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockTx.business.findUnique.mockResolvedValue(null);

      await expect(
        service.createOwnerForBusiness('biz-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when business already has an owner', async () => {
      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(mockBusinessUser);

      await expect(
        service.createOwnerForBusiness('biz-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when user is already a member of the business', async () => {
      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValueOnce(mockUser);
      mockTx.user.update.mockResolvedValue({
        ...mockUser,
        clerkUserId: 'clerk_provisioned',
        status: 'ACTIVE',
      });
      mockTx.businessUser.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createOwnerForBusiness('biz-1', dto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
