import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  AvailabilityException,
  BusinessUser,
  BusinessWorkingHour,
  ServiceProvider,
  ServiceProviderWorkingHour,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const BUSINESS_ID = 'biz-1';
const OTHER_BUSINESS_ID = 'biz-2';
const STAFF_ID = 'sm-1';
const OTHER_STAFF_ID = 'sm-2';

const mockMembership: BusinessUser = {
  id: 'bu-1',
  businessId: BUSINESS_ID,
  userId: USER_ID,
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockManagerMembership: BusinessUser = {
  ...mockMembership,
  id: 'bu-2',
  role: 'MANAGER',
};

const mockServiceProvidership: BusinessUser = {
  ...mockMembership,
  id: 'bu-3',
  role: 'MEMBER',
};

const mockServiceProviderRecord: ServiceProvider = {
  id: STAFF_ID,
  businessId: BUSINESS_ID,
  businessUserId: 'bu-3',
  displayName: 'Alice',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockWorkingHour: BusinessWorkingHour = {
  id: 'bwh-1',
  businessId: BUSINESS_ID,
  dayOfWeek: 0,
  startTime: '09:00',
  endTime: '17:00',
  isClosed: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockServiceProviderWorkingHour: ServiceProviderWorkingHour = {
  id: 'swh-1',
  businessId: BUSINESS_ID,
  serviceProviderId: STAFF_ID,
  dayOfWeek: 0,
  startTime: '09:00',
  endTime: '17:00',
  isClosed: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockException: AvailabilityException = {
  id: 'exc-1',
  businessId: BUSINESS_ID,
  serviceProviderId: null,
  date: new Date('2024-06-15'),
  startTime: null,
  endTime: null,
  isClosed: true,
  reason: 'Holiday',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockExceptionOtherBiz: AvailabilityException = {
  ...mockException,
  id: 'exc-2',
  businessId: OTHER_BUSINESS_ID,
};

const validHours = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isClosed: false,
  startTime: '09:00',
  endTime: '17:00',
}));

const mockPrisma = {
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
  },
  serviceProvider: {
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<ServiceProvider | null>>(),
  },
  businessWorkingHour: {
    findMany: jest.fn<(...args: unknown[]) => Promise<BusinessWorkingHour[]>>(),
    deleteMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    createMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
  },
  serviceProviderWorkingHour: {
    findMany:
      jest.fn<(...args: unknown[]) => Promise<ServiceProviderWorkingHour[]>>(),
    deleteMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    createMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
  },
  availabilityException: {
    findMany:
      jest.fn<(...args: unknown[]) => Promise<AvailabilityException[]>>(),
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<AvailabilityException | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<AvailabilityException>>(),
    update: jest.fn<(...args: unknown[]) => Promise<AvailabilityException>>(),
    delete: jest.fn<(...args: unknown[]) => Promise<AvailabilityException>>(),
  },
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((...args: unknown[]) => {
      const cb = args[0] as (tx: typeof mockPrisma) => Promise<unknown>;
      return cb(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  // ─── getBusinessWorkingHours ───────────────────────────────────────────────

  describe('getBusinessWorkingHours', () => {
    it('assigned user can read business working hours', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessWorkingHour.findMany.mockResolvedValue([
        mockWorkingHour,
      ]);

      const result = await service.getBusinessWorkingHours(
        USER_ID,
        BUSINESS_ID,
      );

      expect(mockPrisma.businessWorkingHour.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ dayOfWeek: 0, startTime: '09:00' });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getBusinessWorkingHours(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessWorkingHour.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── setBusinessWorkingHours ───────────────────────────────────────────────

  describe('setBusinessWorkingHours', () => {
    it('OWNER can update business working hours', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessWorkingHour.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.businessWorkingHour.createMany.mockResolvedValue({ count: 7 });
      mockPrisma.businessWorkingHour.findMany.mockResolvedValue(
        validHours.map((h, i) => ({
          ...mockWorkingHour,
          id: `bwh-${i}`,
          dayOfWeek: h.dayOfWeek,
        })),
      );

      const result = await service.setBusinessWorkingHours(
        USER_ID,
        BUSINESS_ID,
        {
          hours: validHours,
        },
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.businessWorkingHour.deleteMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID },
      });
      expect(mockPrisma.businessWorkingHour.createMany).toHaveBeenCalled();
      expect(result).toHaveLength(7);
    });

    it('MANAGER can update business working hours', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockManagerMembership,
      );
      mockPrisma.businessWorkingHour.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.businessWorkingHour.createMany.mockResolvedValue({ count: 7 });
      mockPrisma.businessWorkingHour.findMany.mockResolvedValue([
        mockWorkingHour,
      ]);

      await expect(
        service.setBusinessWorkingHours(USER_ID, BUSINESS_ID, {
          hours: validHours,
        }),
      ).resolves.toBeDefined();
    });

    it('MEMBER cannot update business working hours', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.setBusinessWorkingHours(USER_ID, BUSINESS_ID, {
          hours: validHours,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('user outside business cannot update working hours', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.setBusinessWorkingHours(OTHER_USER_ID, BUSINESS_ID, {
          hours: validHours,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate dayOfWeek values', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      const withDuplicate = [
        { dayOfWeek: 0, isClosed: false, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 0, isClosed: false, startTime: '09:00', endTime: '17:00' },
      ];

      await expect(
        service.setBusinessWorkingHours(USER_ID, BUSINESS_ID, {
          hours: withDuplicate,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects invalid time range when day is not closed', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      const invalidRange = [
        { dayOfWeek: 0, isClosed: false, startTime: '17:00', endTime: '09:00' },
      ];

      await expect(
        service.setBusinessWorkingHours(USER_ID, BUSINESS_ID, {
          hours: invalidRange,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── setServiceProviderWorkingHours ───────────────────────────────────────

  describe('setServiceProviderWorkingHours', () => {
    it('cannot update service provider working hours if provider belongs to another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      // findFirst returns null because OTHER_STAFF_ID does not belong to BUSINESS_ID
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.setServiceProviderWorkingHours(
          USER_ID,
          BUSINESS_ID,
          OTHER_STAFF_ID,
          {
            hours: validHours,
          },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('OWNER can update service provider working hours when provider belongs to business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProviderRecord,
      );
      mockPrisma.serviceProviderWorkingHour.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrisma.serviceProviderWorkingHour.createMany.mockResolvedValue({
        count: 7,
      });
      mockPrisma.serviceProviderWorkingHour.findMany.mockResolvedValue([
        mockServiceProviderWorkingHour,
      ]);

      const result = await service.setServiceProviderWorkingHours(
        USER_ID,
        BUSINESS_ID,
        STAFF_ID,
        { hours: validHours },
      );

      expect(
        mockPrisma.serviceProviderWorkingHour.deleteMany,
      ).toHaveBeenCalledWith({
        where: { serviceProviderId: STAFF_ID },
      });
      expect(result).toBeDefined();
    });
  });

  // ─── createAvailabilityException ───────────────────────────────────────────

  describe('createAvailabilityException', () => {
    it('can create a business-level availability exception', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.availabilityException.create.mockResolvedValue(mockException);

      const result = await service.createAvailabilityException(
        USER_ID,
        BUSINESS_ID,
        {
          date: '2024-06-15',
          isClosed: true,
          reason: 'Holiday',
        },
      );

      expect(mockPrisma.availabilityException.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            serviceProviderId: null,
            isClosed: true,
          }),
        }),
      );
      expect(result).toMatchObject({ id: 'exc-1', isClosed: true });
    });

    it('can create a provider-level exception when provider belongs to same business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProviderRecord,
      );
      mockPrisma.availabilityException.create.mockResolvedValue({
        ...mockException,
        serviceProviderId: STAFF_ID,
      });

      const result = await service.createAvailabilityException(
        USER_ID,
        BUSINESS_ID,
        {
          date: '2024-06-15',
          serviceProviderId: STAFF_ID,
          isClosed: true,
        },
      );

      expect(mockPrisma.serviceProvider.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: STAFF_ID, businessId: BUSINESS_ID },
        }),
      );
      expect(result.serviceProviderId).toBe(STAFF_ID);
    });

    it('rejects provider-level exception if provider belongs to another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.createAvailabilityException(USER_ID, BUSINESS_ID, {
          date: '2024-06-15',
          serviceProviderId: OTHER_STAFF_ID,
          isClosed: true,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.availabilityException.create).not.toHaveBeenCalled();
    });

    it('MEMBER user cannot create an exception', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createAvailabilityException(USER_ID, BUSINESS_ID, {
          date: '2024-06-15',
          isClosed: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── updateAvailabilityException ───────────────────────────────────────────

  describe('updateAvailabilityException', () => {
    it('cannot update exception from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAvailabilityException(
          USER_ID,
          BUSINESS_ID,
          mockExceptionOtherBiz.id,
          { reason: 'Updated' },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.availabilityException.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteAvailabilityException ───────────────────────────────────────────

  describe('deleteAvailabilityException', () => {
    it('cannot delete exception from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAvailabilityException(
          USER_ID,
          BUSINESS_ID,
          mockExceptionOtherBiz.id,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.availabilityException.delete).not.toHaveBeenCalled();
    });

    it('OWNER can delete an exception in their business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.availabilityException.findFirst.mockResolvedValue(
        mockException,
      );
      mockPrisma.availabilityException.delete.mockResolvedValue(mockException);

      await expect(
        service.deleteAvailabilityException(USER_ID, BUSINESS_ID, 'exc-1'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.availabilityException.delete).toHaveBeenCalledWith({
        where: { id: 'exc-1' },
      });
    });
  });
});
