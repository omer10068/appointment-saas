import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type Business,
  type BusinessUser,
  type User,
} from '../generated/prisma/client';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

const mockUser: User = {
  id: 'user-1',
  clerkUserId: 'clerk_user_123',
  email: 'test@example.com',
  phone: null,
  status: 'ACTIVE',
  platformRole: 'USER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockSuperAdmin: User = {
  id: 'super-admin-1',
  clerkUserId: 'clerk_admin_456',
  email: 'admin@example.com',
  phone: null,
  status: 'ACTIVE',
  platformRole: 'SUPER_ADMIN',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

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

const mockBusinessesService = {
  findMine:
    jest.fn<
      (...args: unknown[]) => Promise<(BusinessUser & { business: Business })[]>
    >(),
};

describe('BusinessesController', () => {
  let controller: BusinessesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessesController],
      providers: [
        { provide: BusinessesService, useValue: mockBusinessesService },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BusinessesController>(BusinessesController);
  });

  describe('findMine', () => {
    it('calls businessesService.findMine with the authenticated user id', async () => {
      mockBusinessesService.findMine.mockResolvedValue([mockBusinessUser]);

      const req = { user: mockUser } as unknown as AuthenticatedRequest;
      const result = await controller.findMine(req);

      expect(mockBusinessesService.findMine).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockBusinessUser]);
    });

    it('returns empty array for a Super Admin with no BusinessUser records', async () => {
      mockBusinessesService.findMine.mockResolvedValue([]);

      const req = { user: mockSuperAdmin } as unknown as AuthenticatedRequest;
      const result = await controller.findMine(req);

      expect(mockBusinessesService.findMine).toHaveBeenCalledWith(
        'super-admin-1',
      );
      expect(result).toEqual([]);
    });

    it('returns only the linked business for a Super Admin assigned to one business', async () => {
      const superAdminBusinessUser: BusinessUser & { business: Business } = {
        ...mockBusinessUser,
        id: 'bu-admin',
        userId: 'super-admin-1',
      };
      mockBusinessesService.findMine.mockResolvedValue([
        superAdminBusinessUser,
      ]);

      const req = { user: mockSuperAdmin } as unknown as AuthenticatedRequest;
      const result = await controller.findMine(req);

      expect(mockBusinessesService.findMine).toHaveBeenCalledWith(
        'super-admin-1',
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('super-admin-1');
    });

    it('passes user id — not platformRole — to the service, ensuring no admin bypass', async () => {
      mockBusinessesService.findMine.mockResolvedValue([]);

      const req = { user: mockSuperAdmin } as unknown as AuthenticatedRequest;
      await controller.findMine(req);

      const [calledWithId] = mockBusinessesService.findMine.mock.calls[0] as [
        string,
      ];
      expect(calledWithId).toBe(mockSuperAdmin.id);
      expect(calledWithId).not.toBe(mockSuperAdmin.platformRole);
    });
  });
});
