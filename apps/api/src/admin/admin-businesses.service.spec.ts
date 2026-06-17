import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type Business, type BusinessUser } from '../generated/prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { BusinessUsersService } from '../business-users/business-users.service';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { AdminBusinessesService } from './admin-businesses.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {};

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

const mockBusinessUser: BusinessUser = {
  id: 'bu-1',
  businessId: 'biz-1',
  userId: 'user-1',
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBusinessesService = {
  create: jest.fn<(...args: unknown[]) => Promise<Business>>(),
  findAll: jest.fn<(...args: unknown[]) => Promise<Business[]>>(),
};

const mockBusinessUsersService = {
  createOwnerForBusiness:
    jest.fn<(...args: unknown[]) => Promise<BusinessUser>>(),
};

describe('AdminBusinessesService', () => {
  let service: AdminBusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBusinessesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BusinessesService, useValue: mockBusinessesService },
        { provide: BusinessUsersService, useValue: mockBusinessUsersService },
      ],
    }).compile();

    service = module.get<AdminBusinessesService>(AdminBusinessesService);
  });

  describe('create', () => {
    it('delegates to BusinessesService.create', async () => {
      const dto: CreateBusinessDto = { name: 'Acme Corp', slug: 'acme-corp', timezone: 'Asia/Jerusalem' };
      mockBusinessesService.create.mockResolvedValue(mockBusiness);

      const result = await service.create(dto);

      expect(mockBusinessesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('findAll', () => {
    it('delegates to BusinessesService.findAll', async () => {
      mockBusinessesService.findAll.mockResolvedValue([mockBusiness]);

      const result = await service.findAll();

      expect(mockBusinessesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockBusiness]);
    });
  });

  describe('createOwner', () => {
    const dto: CreateBusinessOwnerDto = {
      phone: '+972501234567',
      email: 'owner@example.com',
    };

    it('delegates to BusinessUsersService.createOwnerForBusiness', async () => {
      mockBusinessUsersService.createOwnerForBusiness.mockResolvedValue(
        mockBusinessUser,
      );

      const result = await service.createOwner('biz-1', dto);

      expect(
        mockBusinessUsersService.createOwnerForBusiness,
      ).toHaveBeenCalledWith('biz-1', dto);
      expect(result).toEqual(mockBusinessUser);
    });

    it('propagates NotFoundException when business does not exist', async () => {
      mockBusinessUsersService.createOwnerForBusiness.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.createOwner('missing-biz', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates ConflictException when business already has an owner', async () => {
      mockBusinessUsersService.createOwnerForBusiness.mockRejectedValue(
        new ConflictException(),
      );

      await expect(service.createOwner('biz-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
