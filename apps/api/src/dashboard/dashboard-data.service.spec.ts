import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type BusinessCustomer,
  type BusinessUser,
  type CustomerProfile,
  type Service,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardDataService } from './dashboard-data.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const BUSINESS_ID = 'biz-1';
const OTHER_BUSINESS_ID = 'biz-2';

const mockMembership: BusinessUser = {
  id: 'bu-1',
  businessId: BUSINESS_ID,
  userId: USER_ID,
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockService: Service = {
  id: 'svc-1',
  businessId: BUSINESS_ID,
  name: 'Haircut',
  description: 'Basic haircut',
  durationMinutes: 30,
  priceCents: 8000,
  isActive: true,
  bufferBeforeMin: 0,
  bufferAfterMin: 5,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockServiceOtherBiz: Service = {
  id: 'svc-2',
  businessId: OTHER_BUSINESS_ID,
  name: 'Massage',
  description: null,
  durationMinutes: 60,
  priceCents: 15000,
  isActive: true,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProfile: CustomerProfile = {
  id: 'cp-1',
  userId: null,
  fullName: 'Israel Israelson',
  email: 'israel@example.com',
  phone: '050-1234567',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBusinessCustomer: BusinessCustomer & {
  customerProfile: CustomerProfile;
} = {
  id: 'bc-1',
  businessId: BUSINESS_ID,
  customerProfileId: 'cp-1',
  status: 'ACTIVE',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  customerProfile: mockProfile,
};

const mockPrisma = {
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
  },
  service: {
    findMany: jest.fn<(...args: unknown[]) => Promise<Service[]>>(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
  businessCustomer: {
    findMany:
      jest.fn<
        (
          ...args: unknown[]
        ) => Promise<
          (BusinessCustomer & { customerProfile: CustomerProfile })[]
        >
      >(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
};

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardDataService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardDataService>(DashboardDataService);
  });

  // ─── getServices ───────────────────────────────────────────────────────────

  describe('getServices', () => {
    it('returns services when user is a member of the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findMany.mockResolvedValue([mockService]);

      const result = await service.getServices(USER_ID, BUSINESS_ID);

      expect(mockPrisma.businessUser.findUnique).toHaveBeenCalledWith({
        where: {
          businessId_userId: { businessId: BUSINESS_ID, userId: USER_ID },
        },
      });
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'svc-1', name: 'Haircut' });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getServices(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    });

    it('only queries services for the requested businessId', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findMany.mockResolvedValue([mockService]);

      await service.getServices(USER_ID, BUSINESS_ID);

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      // Result should not contain the other-business service
      expect(mockPrisma.service.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: mockServiceOtherBiz.businessId },
        }),
      );
    });

    it('returns an empty array when the business has no services', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findMany.mockResolvedValue([]);

      const result = await service.getServices(USER_ID, BUSINESS_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── getCustomers ──────────────────────────────────────────────────────────

  describe('getCustomers', () => {
    it('returns customers when user is a member of the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findMany.mockResolvedValue([
        mockBusinessCustomer,
      ]);

      const result = await service.getCustomers(USER_ID, BUSINESS_ID);

      expect(mockPrisma.businessCustomer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ fullName: 'Israel Israelson' });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getCustomers(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessCustomer.findMany).not.toHaveBeenCalled();
    });

    it('maps BusinessCustomer + CustomerProfile into the expected DTO shape', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findMany.mockResolvedValue([
        mockBusinessCustomer,
      ]);

      const result = await service.getCustomers(USER_ID, BUSINESS_ID);

      expect(result[0]).toMatchObject({
        businessCustomerId: 'bc-1',
        customerProfileId: 'cp-1',
        fullName: 'Israel Israelson',
        email: 'israel@example.com',
        phone: '050-1234567',
        status: 'ACTIVE',
        notes: null,
      });
    });

    it('returns an empty array when the business has no customers', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findMany.mockResolvedValue([]);

      const result = await service.getCustomers(USER_ID, BUSINESS_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── getSummary ────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns correct counts for the selected business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.count
        .mockResolvedValueOnce(3) // total services
        .mockResolvedValueOnce(2); // active services
      mockPrisma.businessCustomer.count
        .mockResolvedValueOnce(5) // total customers
        .mockResolvedValueOnce(4); // active customers

      const result = await service.getSummary(USER_ID, BUSINESS_ID);

      expect(result).toEqual({
        servicesCount: 3,
        activeServicesCount: 2,
        customersCount: 5,
        activeCustomersCount: 4,
      });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getSummary(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.count).not.toHaveBeenCalled();
      expect(mockPrisma.businessCustomer.count).not.toHaveBeenCalled();
    });

    it('scopes all counts to the given businessId', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.count.mockResolvedValue(0);
      mockPrisma.businessCustomer.count.mockResolvedValue(0);

      await service.getSummary(USER_ID, BUSINESS_ID);

      expect(mockPrisma.service.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: BUSINESS_ID }),
        }),
      );
      expect(mockPrisma.businessCustomer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: BUSINESS_ID }),
        }),
      );
    });
  });
});
