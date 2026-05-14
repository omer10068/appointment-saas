import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { type Business, type BusinessUser } from '../generated/prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { BusinessUsersService } from '../business-users/business-users.service';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { AdminBusinessesService } from './admin-businesses.service';

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

const mockBusinessUser: BusinessUser = {
  id: 'bu-1',
  businessId: 'biz-1',
  userId: 'user-1',
  role: 'OWNER',
  status: 'INVITED',
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
        { provide: BusinessesService, useValue: mockBusinessesService },
        { provide: BusinessUsersService, useValue: mockBusinessUsersService },
      ],
    }).compile();

    service = module.get<AdminBusinessesService>(AdminBusinessesService);
  });

  describe('create', () => {
    it('delegates to BusinessesService.create', async () => {
      const dto: CreateBusinessDto = { name: 'Acme Corp', slug: 'acme-corp' };
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
    it('delegates to BusinessUsersService.createOwnerForBusiness', async () => {
      const dto: CreateBusinessOwnerDto = { email: 'owner@example.com' };
      mockBusinessUsersService.createOwnerForBusiness.mockResolvedValue(
        mockBusinessUser,
      );

      const result = await service.createOwner('biz-1', dto);

      expect(
        mockBusinessUsersService.createOwnerForBusiness,
      ).toHaveBeenCalledWith('biz-1', dto);
      expect(result).toEqual(mockBusinessUser);
    });
  });
});
