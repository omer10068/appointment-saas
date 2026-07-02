import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type Business, type BusinessUser } from '../generated/prisma/client';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { AdminBusinessesService } from './admin-businesses.service';
import { AdminBusinessesController } from './admin-businesses.controller';

class AllowAllGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

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
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdminBusinessesService = {
  create: jest.fn<(...args: unknown[]) => Promise<Business>>(),
  findAll: jest.fn<(...args: unknown[]) => Promise<Business[]>>(),
  createOwner: jest.fn<(...args: unknown[]) => Promise<BusinessUser>>(),
};

describe('AdminBusinessesController', () => {
  let controller: AdminBusinessesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBusinessesController],
      providers: [
        {
          provide: AdminBusinessesService,
          useValue: mockAdminBusinessesService,
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(PlatformAdminGuard)
      .useClass(AllowAllGuard)
      .compile();

    controller = module.get<AdminBusinessesController>(
      AdminBusinessesController,
    );
  });

  describe('create', () => {
    it('delegates to AdminBusinessesService.create', async () => {
      const dto: CreateBusinessDto = { name: 'Acme Corp', slug: 'acme-corp' };
      mockAdminBusinessesService.create.mockResolvedValue(mockBusiness);

      const result = await controller.create(dto);

      expect(mockAdminBusinessesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('findAll', () => {
    it('delegates to AdminBusinessesService.findAll', async () => {
      mockAdminBusinessesService.findAll.mockResolvedValue([mockBusiness]);

      const result = await controller.findAll();

      expect(mockAdminBusinessesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockBusiness]);
    });
  });

  describe('createOwner', () => {
    it('delegates to AdminBusinessesService.createOwner with businessId and dto', async () => {
      const dto: CreateBusinessOwnerDto = {
        phone: '+972501234567',
        email: 'owner@example.com',
      };
      mockAdminBusinessesService.createOwner.mockResolvedValue(
        mockBusinessUser,
      );
      const req = {
        user: { id: 'admin-1' },
      } as unknown as AuthenticatedRequest;

      const result = await controller.createOwner('biz-1', dto, req);

      expect(mockAdminBusinessesService.createOwner).toHaveBeenCalledWith(
        'biz-1',
        dto,
        'admin-1',
      );
      expect(result).toEqual(mockBusinessUser);
    });
  });
});
