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
  });
});
