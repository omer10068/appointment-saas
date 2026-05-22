import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type BusinessCustomer,
  type BusinessUser,
  type CustomerProfile,
  type Service,
  type ServiceProvider,
  type User,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardDataService } from './dashboard-data.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const BUSINESS_ID = 'biz-1';
const OTHER_BUSINESS_ID = 'biz-2';
const STAFF_BU_ID = 'bu-3';

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
  id: STAFF_BU_ID,
  role: 'MEMBER',
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
  phoneNormalized: '+972501234567',
  phoneVerifiedAt: null,
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

// Shape returned by STAFF_SELECT (includes services relation)
const mockServiceProviderRow = {
  id: 'sm-1',
  businessId: BUSINESS_ID,
  displayName: 'Alice',
  isActive: true,
  businessUserId: STAFF_BU_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  services: [{ serviceId: 'svc-1' }],
};

// Raw ServiceProvider (no services relation) — used for mock typing
const mockServiceProvider: ServiceProvider = {
  id: 'sm-1',
  businessId: BUSINESS_ID,
  displayName: 'Alice',
  isActive: true,
  businessUserId: STAFF_BU_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockServiceProviderOtherBiz: ServiceProvider = {
  id: 'sm-2',
  businessId: OTHER_BUSINESS_ID,
  displayName: 'Bob',
  isActive: true,
  businessUserId: 'bu-other',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockNewUser: User = {
  id: 'user-new',
  clerkUserId: null,
  email: 'new@example.com',
  phoneNormalized: '+972529900099',
  phoneVerifiedAt: null,
  status: 'ACTIVE',
  platformRole: 'USER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockNewBu: BusinessUser = {
  id: 'bu-new',
  businessId: BUSINESS_ID,
  userId: 'user-new',
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  business: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<{ status: string } | null>>(),
  },
  user: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<User | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<User>>(),
  },
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
    findMany: jest.fn<(...args: unknown[]) => Promise<BusinessUser[]>>(),
    create: jest.fn<(...args: unknown[]) => Promise<BusinessUser>>(),
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
    findUnique:
      jest.fn<(...args: unknown[]) => Promise<BusinessCustomer | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<BusinessCustomer>>(),
    update: jest.fn<(...args: unknown[]) => Promise<BusinessCustomer>>(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
  customerProfile: {
    findUnique:
      jest.fn<(...args: unknown[]) => Promise<CustomerProfile | null>>(),
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<CustomerProfile | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<CustomerProfile>>(),
    update: jest.fn<(...args: unknown[]) => Promise<CustomerProfile>>(),
  },
  serviceProvider: {
    findMany: jest.fn<(...args: unknown[]) => Promise<ServiceProvider[]>>(),
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<ServiceProvider | null>>(),
    findUnique:
      jest.fn<(...args: unknown[]) => Promise<ServiceProvider | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<ServiceProvider>>(),
    update: jest.fn<(...args: unknown[]) => Promise<ServiceProvider>>(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
  serviceProviderService: {
    createMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    deleteMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
  },
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.business.findUnique.mockResolvedValue({ status: 'ACTIVE' });

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

    it('throws ForbiddenException when BusinessUser status is BLOCKED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'BLOCKED',
      });

      await expect(
        service.getServices(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when BusinessUser status is INVITED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'INVITED',
      });

      await expect(
        service.getServices(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
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

    it('maps CustomerProfile.phoneNormalized as the phone field in the DTO', async () => {
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
        phone: '+972501234567',
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
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      mockPrisma.businessCustomer.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);

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

    it('MEMBER cannot create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createService(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when BusinessUser status is BLOCKED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'BLOCKED',
      });

      await expect(
        service.createService(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when BusinessUser status is INVITED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'INVITED',
      });

      await expect(
        service.createService(USER_ID, BUSINESS_ID, createDto),
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

    it('MEMBER cannot update a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

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
  });

  // ─── createCustomer ────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    const createDto = {
      fullName: 'New Customer',
      email: 'new@example.com',
      phone: '050-9999999',
    };

    const newProfile: CustomerProfile = {
      id: 'cp-new',
      userId: null,
      fullName: 'New Customer',
      email: 'new@example.com',
      phoneNormalized: '+972509999999',
      phoneVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newBc: BusinessCustomer = {
      id: 'bc-new',
      businessId: BUSINESS_ID,
      customerProfileId: 'cp-new',
      status: 'ACTIVE',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('OWNER can create a customer — creates new CustomerProfile and BusinessCustomer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.customerProfile.findUnique.mockResolvedValue(null); // no existing profile
      mockPrisma.customerProfile.create.mockResolvedValue(newProfile);
      mockPrisma.businessCustomer.findUnique.mockResolvedValue(null); // not yet linked
      mockPrisma.businessCustomer.create.mockResolvedValue(newBc);

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
        phone: '+972509999999',
        status: 'ACTIVE',
      });
    });

    it('reuses existing CustomerProfile when phone already exists globally', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.customerProfile.findUnique.mockResolvedValue(newProfile); // profile exists
      mockPrisma.businessCustomer.findUnique.mockResolvedValue(null); // not yet linked to this business
      mockPrisma.businessCustomer.create.mockResolvedValue(newBc);

      const result = await service.createCustomer(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.customerProfile.create).not.toHaveBeenCalled();
      expect(mockPrisma.businessCustomer.create).toHaveBeenCalled();
      expect(result.customerProfileId).toBe('cp-new');
    });

    it('throws ConflictException when phone is already linked to this business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.customerProfile.findUnique.mockResolvedValue(newProfile);
      mockPrisma.businessCustomer.findUnique.mockResolvedValue(newBc); // already linked

      await expect(
        service.createCustomer(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.businessCustomer.create).not.toHaveBeenCalled();
    });

    it('MEMBER cannot create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createCustomer(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── updateCustomer ────────────────────────────────────────────────────────

  describe('updateCustomer', () => {
    const updateDto = { fullName: 'Updated Name', notes: 'Updated notes' };

    it('OWNER can update a customer', async () => {
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

      expect(result).toMatchObject({
        fullName: 'Updated Name',
        notes: 'Updated notes',
      });
    });

    it('cannot update a customer from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCustomer(
          USER_ID,
          BUSINESS_ID,
          mockBusinessCustomerOtherBiz.id,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('MEMBER cannot update a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

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

    it('MEMBER cannot change customer status', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.setCustomerStatus(USER_ID, BUSINESS_ID, 'bc-1', 'BLOCKED'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getServiceProviders ───────────────────────────────────────────────────

  describe('getServiceProviders', () => {
    it('returns service providers when user is a member of the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findMany.mockResolvedValue([
        mockServiceProviderRow,
      ]);

      const result = await service.getServiceProviders(USER_ID, BUSINESS_ID);

      expect(mockPrisma.serviceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'sm-1',
        displayName: 'Alice',
        businessUserId: STAFF_BU_ID,
        serviceIds: ['svc-1'],
      });
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getServiceProviders(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.serviceProvider.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createServiceProvider ─────────────────────────────────────────────────

  describe('createServiceProvider', () => {
    const createDto = {
      displayName: 'Alice',
      businessUserId: STAFF_BU_ID,
      serviceIds: ['svc-1'],
    };

    it('OWNER can create a service provider with businessUserId and serviceIds', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership); // caller access
      mockPrisma.businessUser.findFirst.mockResolvedValue(
        mockServiceProvidership,
      ); // BU in business, ACTIVE
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null); // no duplicate
      mockPrisma.service.findMany.mockResolvedValue([mockService]); // services valid
      mockPrisma.serviceProvider.create.mockResolvedValue(mockServiceProvider);
      mockPrisma.serviceProviderService.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.createServiceProvider(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.serviceProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            displayName: 'Alice',
            businessUserId: STAFF_BU_ID,
          }),
        }),
      );
      expect(mockPrisma.serviceProviderService.createMany).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'sm-1',
        displayName: 'Alice',
        businessUserId: STAFF_BU_ID,
        serviceIds: ['svc-1'],
      });
    });

    it('MEMBER cannot create a service provider', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createServiceProvider(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.serviceProvider.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when businessUserId does not belong to this business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(null); // BU not in business

      await expect(
        service.createServiceProvider(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.serviceProvider.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when businessUserId already has a ServiceProvider', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(
        mockServiceProvidership,
      );
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(
        mockServiceProvider,
      ); // already exists

      await expect(
        service.createServiceProvider(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.serviceProvider.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a serviceId does not belong to this business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(
        mockServiceProvidership,
      );
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null);
      mockPrisma.service.findMany.mockResolvedValue([]); // service not found in this business

      await expect(
        service.createServiceProvider(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateServiceProvider ─────────────────────────────────────────────────

  describe('updateServiceProvider', () => {
    const updateDto = { displayName: 'Alice Updated' };

    const existingStaffRow = {
      id: 'sm-1',
      isActive: true,
      businessUserId: STAFF_BU_ID,
      services: [{ serviceId: 'svc-1' }],
    };

    it('OWNER can update a service provider', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        existingStaffRow as unknown as ServiceProvider,
      );
      mockPrisma.serviceProvider.update.mockResolvedValue(
        mockServiceProviderRow,
      );

      const result = await service.updateServiceProvider(
        USER_ID,
        BUSINESS_ID,
        'sm-1',
        updateDto,
      );

      expect(mockPrisma.serviceProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sm-1' } }),
      );
      expect(result).toMatchObject({ id: 'sm-1' });
    });

    it('cannot update a service provider from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.updateServiceProvider(
          USER_ID,
          BUSINESS_ID,
          mockServiceProviderOtherBiz.id,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.serviceProvider.update).not.toHaveBeenCalled();
    });

    it('MEMBER cannot update a service provider', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.updateServiceProvider(USER_ID, BUSINESS_ID, 'sm-1', updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.serviceProvider.findFirst).not.toHaveBeenCalled();
    });

    it('replaces services when serviceIds provided', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        existingStaffRow as unknown as ServiceProvider,
      );
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.serviceProviderService.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.serviceProviderService.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.serviceProvider.update.mockResolvedValue(
        mockServiceProviderRow,
      );

      await service.updateServiceProvider(USER_ID, BUSINESS_ID, 'sm-1', {
        serviceIds: ['svc-1'],
      });

      expect(mockPrisma.serviceProviderService.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.serviceProviderService.createMany).toHaveBeenCalled();
    });
  });

  // ─── setServiceProviderStatus ──────────────────────────────────────────────

  describe('setServiceProviderStatus', () => {
    const existingStaffRow = {
      id: 'sm-1',
      businessUserId: STAFF_BU_ID,
      services: [{ serviceId: 'svc-1' }],
    };

    it('can deactivate a service provider', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        existingStaffRow as unknown as ServiceProvider,
      );
      mockPrisma.serviceProvider.update.mockResolvedValue({
        ...mockServiceProviderRow,
        isActive: false,
      });

      const result = await service.setServiceProviderStatus(
        USER_ID,
        BUSINESS_ID,
        'sm-1',
        false,
      );

      expect(mockPrisma.serviceProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sm-1' },
          data: { isActive: false },
        }),
      );
      expect(result).toMatchObject({ isActive: false });
    });

    it('cannot activate a service provider with no services', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue({
        ...existingStaffRow,
        services: [],
      } as unknown as ServiceProvider);

      await expect(
        service.setServiceProviderStatus(USER_ID, BUSINESS_ID, 'sm-1', true),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.serviceProvider.update).not.toHaveBeenCalled();
    });

    it('cannot activate a service provider whose BusinessUser is not ACTIVE', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // caller access
        .mockResolvedValueOnce({
          status: 'INVITED',
        } as unknown as BusinessUser); // staff's BU
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        existingStaffRow as unknown as ServiceProvider,
      );

      await expect(
        service.setServiceProviderStatus(USER_ID, BUSINESS_ID, 'sm-1', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('cannot change status of a service provider from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.setServiceProviderStatus(
          USER_ID,
          BUSINESS_ID,
          mockServiceProviderOtherBiz.id,
          false,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.serviceProvider.update).not.toHaveBeenCalled();
    });

    it('MEMBER cannot change service provider status', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.setServiceProviderStatus(USER_ID, BUSINESS_ID, 'sm-1', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getBusinessUsers ──────────────────────────────────────────────────────

  describe('getBusinessUsers', () => {
    const mockBuRow = {
      id: 'bu-1',
      userId: USER_ID,
      role: 'OWNER',
      status: 'ACTIVE',
      serviceProvider: null,
    };

    it('OWNER can list business users', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findMany.mockResolvedValue([
        mockBuRow,
      ] as unknown as BusinessUser[]);

      const result = await service.getBusinessUsers(USER_ID, BUSINESS_ID);

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'bu-1',
        userId: USER_ID,
        role: 'OWNER',
        status: 'ACTIVE',
        hasServiceProviderProfile: false,
      });
    });

    it('MANAGER cannot list business users', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockManagerMembership,
      );

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it('MEMBER cannot list business users', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is not assigned to the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getBusinessUsers(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when OWNER status is BLOCKED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'BLOCKED',
      });

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when OWNER status is INVITED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue({
        ...mockMembership,
        status: 'INVITED',
      });

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createBusinessUser ────────────────────────────────────────────────────

  describe('createBusinessUser', () => {
    const createDto = {
      phone: '052-990-0099',
      email: 'new@example.com',
      role: 'MEMBER' as const,
    };

    it('OWNER can create a MEMBER BusinessUser — creates new User when phone is new', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // assertMutationAccess
        .mockResolvedValueOnce(null); // no existing BusinessUser
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null);

      const result = await service.createBusinessUser(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNormalized: '+972529900099',
            status: 'ACTIVE',
            platformRole: 'USER',
          }),
        }),
      );
      expect(mockPrisma.businessUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            role: 'MEMBER',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result).toMatchObject({
        id: 'bu-new',
        userId: 'user-new',
        businessId: BUSINESS_ID,
        role: 'MEMBER',
        status: 'ACTIVE',
        phoneNormalized: '+972529900099',
        email: 'new@example.com',
        serviceProviderId: null,
      });
    });

    it('reuses existing User when phone already exists globally', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null);

      await service.createBusinessUser(USER_ID, BUSINESS_ID, createDto);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.businessUser.create).toHaveBeenCalled();
    });

    it('throws ConflictException when user is already a member of the business', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockNewBu); // already a member
      mockPrisma.user.findUnique.mockResolvedValue(mockNewUser);

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
    });

    it('MEMBER cannot create a BusinessUser', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('MANAGER → ForbiddenException', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValueOnce(
        mockManagerMembership,
      );

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('includes serviceProviderId when a ServiceProvider already exists for the BusinessUser', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.serviceProvider.findUnique.mockResolvedValue({
        id: 'sm-existing',
      } as ServiceProvider);

      const result = await service.createBusinessUser(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(result.serviceProviderId).toBe('sm-existing');
    });

    it('throws BadRequestException for an invalid phone number', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, {
          phone: 'not-a-phone',
          role: 'MEMBER',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates User without email when email is omitted', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...mockNewUser, email: null });
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null);

      await service.createBusinessUser(USER_ID, BUSINESS_ID, {
        phone: '052-990-0099',
        role: 'MEMBER',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });
  });

  // ─── Business.status enforcement ──────────────────────────────────────────

  describe('Business.status enforcement', () => {
    it('assertAccess throws ForbiddenException when Business is SUSPENDED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'SUSPENDED' });

      await expect(
        service.getServices(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    });

    it('assertAccess throws ForbiddenException when Business is CANCELLED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'CANCELLED' });

      await expect(
        service.getServices(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    });

    it('assertMutationAccess throws ForbiddenException when Business is SUSPENDED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'SUSPENDED' });

      await expect(
        service.createService(USER_ID, BUSINESS_ID, { name: 'X', durationMinutes: 30 }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('assertMutationAccess throws ForbiddenException when Business is CANCELLED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'CANCELLED' });

      await expect(
        service.createService(USER_ID, BUSINESS_ID, { name: 'X', durationMinutes: 30 }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('assertOwnerAccess throws ForbiddenException when Business is SUSPENDED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'SUSPENDED' });

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it('assertOwnerAccess throws ForbiddenException when Business is CANCELLED', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.business.findUnique.mockResolvedValue({ status: 'CANCELLED' });

      await expect(
        service.getBusinessUsers(USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });
  });
});
