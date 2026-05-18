import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type Business,
  type BusinessUser,
  type User,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  },
};

const mockPrisma = {
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

describe('BusinessUsersService', () => {
  let service: BusinessUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((...args: unknown[]) => {
      const fn = args[0] as (tx: typeof mockTx) => Promise<unknown>;
      return fn(mockTx);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessUsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessUsersService>(BusinessUsersService);
  });

  describe('createOwnerForBusiness', () => {
    const dto: CreateBusinessOwnerDto = {
      phone: '050-1111111',
      email: 'owner@example.com',
    };

    it('creates an invited user and owner membership when user does not exist', async () => {
      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValue(null);
      mockTx.user.create.mockResolvedValue(mockUser);
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);

      const result = await service.createOwnerForBusiness('biz-1', dto);

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
      expect(result).toEqual(mockBusinessUser);
    });

    it('reuses an existing user found by phone and creates owner membership', async () => {
      mockTx.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.businessUser.findFirst.mockResolvedValue(null);
      mockTx.user.findUnique.mockResolvedValue(mockUser);
      mockTx.businessUser.create.mockResolvedValue(mockBusinessUser);

      const result = await service.createOwnerForBusiness('biz-1', dto);

      expect(mockTx.user.create).not.toHaveBeenCalled();
      expect(mockTx.businessUser.create).toHaveBeenCalledWith({
        data: {
          businessId: 'biz-1',
          userId: mockUser.id,
          role: 'OWNER',
          status: 'INVITED',
        },
      });
      expect(result).toEqual(mockBusinessUser);
    });

    it('throws BadRequestException when phone is invalid', async () => {
      const badDto: CreateBusinessOwnerDto = { phone: 'not-a-phone' };
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
      mockTx.user.findUnique.mockResolvedValue(mockUser);
      mockTx.businessUser.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createOwnerForBusiness('biz-1', dto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
