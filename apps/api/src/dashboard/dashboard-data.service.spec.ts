import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type BusinessCustomer,
  type BusinessUser,
  type CustomerProfile,
  type Service,
  type StaffMember,
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

const mockManagerMembership: BusinessUser = {
  ...mockMembership,
  id: 'bu-2',
  role: 'MANAGER',
};

const mockStaffMembership: BusinessUser = {
  ...mockMembership,
  id: 'bu-3',
  role: 'STAFF',
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

const mockBusinessCustomerOtherBiz: BusinessCustomer = {
  id: 'bc-2',
  businessId: OTHER_BUSINESS_ID,
  customerProfileId: 'cp-2',
  status: 'ACTIVE',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStaffMember: StaffMember = {
  id: 'sm-1',
  businessId: BUSINESS_ID,
  displayName: 'Alice',
  isActive: true,
  businessUserId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStaffMemberOtherBiz: StaffMember = {
  id: 'sm-2',
  businessId: OTHER_BUSINESS_ID,
  displayName: 'Bob',
  isActive: true,
  businessUserId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
  },
  service: {
    findMany: jest.fn<(...args: unknown[]) => Promise<Service[]>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<Service | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<Service>>(),
    update: jest.fn<(...args: unknown[]) => Promise<Service>>(),
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
    findFirst:
      jest.fn<
        (
          ...args: unknown[]
        ) => Promise<
          (BusinessCustomer & { customerProfile: CustomerProfile }) | null
        >
      >(),
    create: jest.fn<(...args: unknown[]) => Promise<BusinessCustomer>>(),
    update: jest.fn<(...args: unknown[]) => Promise<BusinessCustomer>>(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
  customerProfile: {
    create: jest.fn<(...args: unknown[]) => Promise<CustomerProfile>>(),
    update: jest.fn<(...args: unknown[]) => Promise<CustomerProfile>>(),
  },
  staffMember: {
    findMany: jest.fn<(...args: unknown[]) => Promise<StaffMember[]>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<StaffMember | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<StaffMember>>(),
    update: jest.fn<(...args: unknown[]) => Promise<StaffMember>>(),
  },
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default $transaction implementation: run callback with mockPrisma as tx
    mockPrisma.$transaction.mockImplementation((...args: unknown[]) => {
      const cb = args[0] as (tx: typeof mockPrisma) => Promise<unknown>;
      return cb(mockPrisma);
    });

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

  // ─── createService ─────────────────────────────────────────────────────────

  describe('createService', () => {
    const createDto = {
      name: 'Haircut',
      durationMinutes: 30,
      priceCents: 8000,
    };

    it('OWNER can create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.create.mockResolvedValue(mockService);

      const result = await service.createService(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            name: 'Haircut',
          }),
        }),
      );
      expect(result).toMatchObject({ id: 'svc-1', name: 'Haircut' });
    });

    it('MANAGER can create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockManagerMembership,
      );
      mockPrisma.service.create.mockResolvedValue(mockService);

      await expect(
        service.createService(USER_ID, BUSINESS_ID, createDto),
      ).resolves.toMatchObject({ id: 'svc-1' });
    });

    it('STAFF cannot create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createService(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('user not assigned to business cannot create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.createService(OTHER_USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('defaults isActive to true when not provided', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.create.mockResolvedValue(mockService);

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'New Service',
        durationMinutes: 60,
      });

      expect(mockPrisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  // ─── updateService ─────────────────────────────────────────────────────────

  describe('updateService', () => {
    const updateDto = { name: 'Premium Haircut', priceCents: 12000 };

    it('OWNER can update a service in their business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.service.update.mockResolvedValue({
        ...mockService,
        name: 'Premium Haircut',
        priceCents: 12000,
      });

      const result = await service.updateService(
        USER_ID,
        BUSINESS_ID,
        'svc-1',
        updateDto,
      );

      expect(mockPrisma.service.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'svc-1', businessId: BUSINESS_ID },
        }),
      );
      expect(mockPrisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'svc-1' } }),
      );
      expect(result).toMatchObject({ name: 'Premium Haircut' });
    });

    it('cannot update a service that belongs to another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.updateService(
          USER_ID,
          BUSINESS_ID,
          mockServiceOtherBiz.id,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.service.update).not.toHaveBeenCalled();
    });

    it('STAFF cannot update a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.updateService(USER_ID, BUSINESS_ID, 'svc-1', updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.update).not.toHaveBeenCalled();
    });
  });

  // ─── setServiceStatus ──────────────────────────────────────────────────────

  describe('setServiceStatus', () => {
    it('can deactivate a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.service.update.mockResolvedValue({
        ...mockService,
        isActive: false,
      });

      const result = await service.setServiceStatus(
        USER_ID,
        BUSINESS_ID,
        'svc-1',
        false,
      );

      expect(mockPrisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'svc-1' },
          data: { isActive: false },
        }),
      );
      expect(result).toMatchObject({ isActive: false });
    });

    it('can reactivate a service', async () => {
      const inactiveService = { ...mockService, isActive: false };
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(inactiveService);
      mockPrisma.service.update.mockResolvedValue(mockService);

      const result = await service.setServiceStatus(
        USER_ID,
        BUSINESS_ID,
        'svc-1',
        true,
      );

      expect(result).toMatchObject({ isActive: true });
    });

    it('cannot deactivate a service from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.setServiceStatus(
          USER_ID,
          BUSINESS_ID,
          mockServiceOtherBiz.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.service.update).not.toHaveBeenCalled();
    });

    it('STAFF cannot deactivate a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.setServiceStatus(USER_ID, BUSINESS_ID, 'svc-1', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── createCustomer ────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    const createDto = {
      fullName: 'New Customer',
      email: 'new@example.com',
      phone: '050-9999999',
    };

    it('OWNER can create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.customerProfile.create.mockResolvedValue({
        ...mockProfile,
        id: 'cp-new',
        fullName: 'New Customer',
        email: 'new@example.com',
        phone: '050-9999999',
      });
      mockPrisma.businessCustomer.create.mockResolvedValue({
        id: 'bc-new',
        businessId: BUSINESS_ID,
        customerProfileId: 'cp-new',
        status: 'ACTIVE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createCustomer(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fullName: 'New Customer' }),
        }),
      );
      expect(mockPrisma.businessCustomer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ businessId: BUSINESS_ID }),
        }),
      );
      expect(result).toMatchObject({
        fullName: 'New Customer',
        email: 'new@example.com',
        status: 'ACTIVE',
      });
    });

    it('MANAGER can create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockManagerMembership,
      );
      mockPrisma.customerProfile.create.mockResolvedValue({
        ...mockProfile,
        id: 'cp-new',
        fullName: 'New Customer',
      });
      mockPrisma.businessCustomer.create.mockResolvedValue({
        id: 'bc-new',
        businessId: BUSINESS_ID,
        customerProfileId: 'cp-new',
        status: 'ACTIVE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.createCustomer(USER_ID, BUSINESS_ID, createDto),
      ).resolves.toMatchObject({ fullName: 'New Customer' });
    });

    it('STAFF cannot create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createCustomer(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('user not assigned to business cannot create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.createCustomer(OTHER_USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('defaults status to ACTIVE when not provided', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.customerProfile.create.mockResolvedValue({
        ...mockProfile,
        id: 'cp-new',
        fullName: 'New Customer',
      });
      mockPrisma.businessCustomer.create.mockResolvedValue({
        id: 'bc-new',
        businessId: BUSINESS_ID,
        customerProfileId: 'cp-new',
        status: 'ACTIVE',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createCustomer(USER_ID, BUSINESS_ID, {
        fullName: 'New Customer',
      });

      expect(mockPrisma.businessCustomer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ─── updateCustomer ────────────────────────────────────────────────────────

  describe('updateCustomer', () => {
    const updateDto = {
      fullName: 'Updated Name',
      notes: 'Updated notes',
    };

    it('OWNER can update a customer in their business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(
        mockBusinessCustomer,
      );
      mockPrisma.customerProfile.update.mockResolvedValue({
        ...mockProfile,
        fullName: 'Updated Name',
      });
      mockPrisma.businessCustomer.update.mockResolvedValue({
        ...mockBusinessCustomer,
        notes: 'Updated notes',
      });

      const result = await service.updateCustomer(
        USER_ID,
        BUSINESS_ID,
        'bc-1',
        updateDto,
      );

      expect(mockPrisma.businessCustomer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bc-1', businessId: BUSINESS_ID },
        }),
      );
      expect(result).toMatchObject({
        fullName: 'Updated Name',
        notes: 'Updated notes',
      });
    });

    it('cannot update a customer that belongs to another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      // findFirst returns null because bc-2 does not belong to BUSINESS_ID
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCustomer(
          USER_ID,
          BUSINESS_ID,
          mockBusinessCustomerOtherBiz.id,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('STAFF cannot update a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.updateCustomer(USER_ID, BUSINESS_ID, 'bc-1', updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessCustomer.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── setCustomerStatus ─────────────────────────────────────────────────────

  describe('setCustomerStatus', () => {
    it('can block a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(
        mockBusinessCustomer,
      );
      mockPrisma.businessCustomer.update.mockResolvedValue({
        ...mockBusinessCustomer,
        status: 'BLOCKED',
      });

      const result = await service.setCustomerStatus(
        USER_ID,
        BUSINESS_ID,
        'bc-1',
        'BLOCKED',
      );

      expect(mockPrisma.businessCustomer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bc-1' },
          data: { status: 'BLOCKED' },
        }),
      );
      expect(result).toMatchObject({ status: 'BLOCKED' });
    });

    it('can archive a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(
        mockBusinessCustomer,
      );
      mockPrisma.businessCustomer.update.mockResolvedValue({
        ...mockBusinessCustomer,
        status: 'ARCHIVED',
      });

      const result = await service.setCustomerStatus(
        USER_ID,
        BUSINESS_ID,
        'bc-1',
        'ARCHIVED',
      );

      expect(result).toMatchObject({ status: 'ARCHIVED' });
    });

    it('cannot change status of a customer from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(null);

      await expect(
        service.setCustomerStatus(
          USER_ID,
          BUSINESS_ID,
          mockBusinessCustomerOtherBiz.id,
          'BLOCKED',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.businessCustomer.update).not.toHaveBeenCalled();
    });

    it('STAFF cannot change customer status', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.setCustomerStatus(USER_ID, BUSINESS_ID, 'bc-1', 'BLOCKED'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('read endpoint still returns customers scoped to businessId', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findMany.mockResolvedValue([
        mockBusinessCustomer,
      ]);

      await service.getCustomers(USER_ID, BUSINESS_ID);

      expect(mockPrisma.businessCustomer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(mockPrisma.businessCustomer.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: OTHER_BUSINESS_ID },
        }),
      );
    });
  });

  // ─── getStaff ──────────────────────────────────────────────────────────────

  describe('getStaff', () => {
    it('returns staff when user is a member of the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findMany.mockResolvedValue([mockStaffMember]);

      const result = await service.getStaff(USER_ID, BUSINESS_ID);

      expect(mockPrisma.staffMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'sm-1', displayName: 'Alice' });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getStaff(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.staffMember.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createStaffMember ─────────────────────────────────────────────────────

  describe('createStaffMember', () => {
    const createDto = { displayName: 'Alice' };

    it('OWNER can create a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.create.mockResolvedValue(mockStaffMember);

      const result = await service.createStaffMember(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.staffMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            displayName: 'Alice',
          }),
        }),
      );
      expect(result).toMatchObject({ id: 'sm-1', displayName: 'Alice' });
    });

    it('MANAGER can create a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockManagerMembership,
      );
      mockPrisma.staffMember.create.mockResolvedValue(mockStaffMember);

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).resolves.toMatchObject({ id: 'sm-1' });
    });

    it('STAFF cannot create a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.staffMember.create).not.toHaveBeenCalled();
    });

    it('defaults isActive to true when not provided', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.create.mockResolvedValue(mockStaffMember);

      await service.createStaffMember(USER_ID, BUSINESS_ID, createDto);

      expect(mockPrisma.staffMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('validates businessUserId belongs to the same business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, {
          displayName: 'Alice',
          businessUserId: 'bu-other',
        }),
      ).rejects.toThrow();

      expect(mockPrisma.staffMember.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateStaffMember ─────────────────────────────────────────────────────

  describe('updateStaffMember', () => {
    const updateDto = { displayName: 'Alice Updated' };

    it('OWNER can update a staff member in their business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(mockStaffMember);
      mockPrisma.staffMember.update.mockResolvedValue({
        ...mockStaffMember,
        displayName: 'Alice Updated',
      });

      const result = await service.updateStaffMember(
        USER_ID,
        BUSINESS_ID,
        'sm-1',
        updateDto,
      );

      expect(mockPrisma.staffMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sm-1', businessId: BUSINESS_ID },
        }),
      );
      expect(result).toMatchObject({ displayName: 'Alice Updated' });
    });

    it('cannot update a staff member from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStaffMember(
          USER_ID,
          BUSINESS_ID,
          mockStaffMemberOtherBiz.id,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.staffMember.update).not.toHaveBeenCalled();
    });

    it('STAFF cannot update a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.updateStaffMember(USER_ID, BUSINESS_ID, 'sm-1', updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.staffMember.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── setStaffMemberStatus ──────────────────────────────────────────────────

  describe('setStaffMemberStatus', () => {
    it('can deactivate a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(mockStaffMember);
      mockPrisma.staffMember.update.mockResolvedValue({
        ...mockStaffMember,
        isActive: false,
      });

      const result = await service.setStaffMemberStatus(
        USER_ID,
        BUSINESS_ID,
        'sm-1',
        false,
      );

      expect(mockPrisma.staffMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sm-1' },
          data: { isActive: false },
        }),
      );
      expect(result).toMatchObject({ isActive: false });
    });

    it('cannot change status of a staff member from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(null);

      await expect(
        service.setStaffMemberStatus(
          USER_ID,
          BUSINESS_ID,
          mockStaffMemberOtherBiz.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.staffMember.update).not.toHaveBeenCalled();
    });

    it('STAFF cannot change staff member status', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.setStaffMemberStatus(USER_ID, BUSINESS_ID, 'sm-1', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
