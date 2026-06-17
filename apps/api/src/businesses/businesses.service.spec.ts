import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type Business, type BusinessUser } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';

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

const mockBusinessUser: BusinessUser & { business: Business } = {
  id: 'bu-1',
  businessId: 'biz-1',
  userId: 'user-1',
  role: 'OWNER',
  status: 'INVITED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  business: mockBusiness,
};

const mockOtherBusiness: Business = {
  id: 'biz-2',
  name: 'Other Corp',
  slug: 'other-corp',
  status: 'ACTIVE',
  timezone: 'Asia/Jerusalem',
  locale: 'he-IL',
  currency: 'ILS',
  publicBookingEnabled: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  business: {
    create: jest.fn<(...args: unknown[]) => Promise<Business>>(),
    findMany: jest.fn<(...args: unknown[]) => Promise<Business[]>>(),
  },
  businessUser: {
    findMany:
      jest.fn<
        (
          ...args: unknown[]
        ) => Promise<(BusinessUser & { business: Business })[]>
      >(),
  },
};

describe('BusinessesService', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  describe('create', () => {
    const dto: CreateBusinessDto = {
      name: 'Acme Corp',
      slug: 'acme-corp',
      timezone: 'Asia/Jerusalem',
    };

    it('creates and returns a DRAFT business when the slug is available', async () => {
      mockPrisma.business.create.mockResolvedValue(mockBusiness);

      const result = await service.create(dto);

      expect(mockPrisma.business.create).toHaveBeenCalledWith({
        data: { ...dto, status: 'DRAFT' },
      });
      expect(result).toEqual(mockBusiness);
    });

    it('throws ConflictException when the slug already exists (P2002)', async () => {
      mockPrisma.business.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('re-throws unknown errors', async () => {
      const unknown = new Error('db down');
      mockPrisma.business.create.mockRejectedValue(unknown);

      await expect(service.create(dto)).rejects.toThrow('db down');
    });
  });

  describe('findAll', () => {
    it('calls prisma.business.findMany with orderBy createdAt desc', async () => {
      mockPrisma.business.findMany.mockResolvedValue([mockBusiness]);

      const result = await service.findAll();

      expect(mockPrisma.business.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBusiness]);
    });
  });

  describe('findMine', () => {
    it('queries businessUser by userId and includes business', async () => {
      mockPrisma.businessUser.findMany.mockResolvedValue([mockBusinessUser]);

      const result = await service.findMine('user-1');

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { business: true },
      });
      expect(result).toEqual([mockBusinessUser]);
    });

    it('returns only businesses linked to the given user', async () => {
      mockPrisma.businessUser.findMany.mockResolvedValue([mockBusinessUser]);

      const result = await service.findMine('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].business).toEqual(mockBusiness);
    });

    it('returns an empty array when the user has no business memberships', async () => {
      mockPrisma.businessUser.findMany.mockResolvedValue([]);

      const result = await service.findMine('user-with-no-memberships');

      expect(result).toEqual([]);
    });

    it('returns empty array for a Super Admin with no BusinessUser records', async () => {
      mockPrisma.businessUser.findMany.mockResolvedValue([]);

      const result = await service.findMine('super-admin-user-id');

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'super-admin-user-id' },
        include: { business: true },
      });
      expect(result).toEqual([]);
    });

    it('returns only the linked business for a Super Admin assigned to one business', async () => {
      const superAdminBusinessUser: BusinessUser & { business: Business } = {
        id: 'bu-admin-1',
        businessId: 'biz-1',
        userId: 'super-admin-user-id',
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        business: mockBusiness,
      };
      mockPrisma.businessUser.findMany.mockResolvedValue([
        superAdminBusinessUser,
      ]);

      const result = await service.findMine('super-admin-user-id');

      expect(result).toHaveLength(1);
      expect(result[0].businessId).toBe('biz-1');
      expect(result[0].userId).toBe('super-admin-user-id');
    });

    it('never returns businesses belonging to other users', async () => {
      const otherUserBu: BusinessUser & { business: Business } = {
        id: 'bu-other',
        businessId: 'biz-2',
        userId: 'other-user-id',
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        business: mockOtherBusiness,
      };
      // Prisma only returns records matching the where clause; simulate that behaviour
      mockPrisma.businessUser.findMany.mockResolvedValue([]);

      const result = await service.findMine('user-1');

      expect(result).not.toContainEqual(
        expect.objectContaining({ userId: otherUserBu.userId }),
      );
      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { business: true },
      });
    });
  });
});
