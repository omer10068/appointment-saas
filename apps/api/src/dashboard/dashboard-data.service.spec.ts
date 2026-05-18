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
  type StaffMember,
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

const mockStaffMembership: BusinessUser = {
  ...mockMembership,
  id: STAFF_BU_ID,
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
const mockStaffMemberRow = {
  id: 'sm-1',
  businessId: BUSINESS_ID,
  displayName: 'Alice',
  isActive: true,
  businessUserId: STAFF_BU_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  services: [{ serviceId: 'svc-1' }],
};

// Raw StaffMember (no services relation) — used for mock typing
const mockStaffMember: StaffMember = {
  id: 'sm-1',
  businessId: BUSINESS_ID,
  displayName: 'Alice',
  isActive: true,
  businessUserId: STAFF_BU_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStaffMemberOtherBiz: StaffMember = {
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
  role: 'STAFF',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
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
  staffMember: {
    findMany: jest.fn<(...args: unknown[]) => Promise<StaffMember[]>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<StaffMember | null>>(),
    findUnique: jest.fn<(...args: unknown[]) => Promise<StaffMember | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<StaffMember>>(),
    update: jest.fn<(...args: unknown[]) => Promise<StaffMember>>(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
  },
  staffMemberService: {
    createMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    deleteMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
  },
  $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(async () => {
    jest.clearAllMocks();

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

    it('STAFF cannot create a service', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

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

    it('STAFF cannot create a customer', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

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
  });

  // ─── getStaff ──────────────────────────────────────────────────────────────

  describe('getStaff', () => {
    it('returns staff when user is a member of the business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findMany.mockResolvedValue([mockStaffMemberRow]);

      const result = await service.getStaff(USER_ID, BUSINESS_ID);

      expect(mockPrisma.staffMember.findMany).toHaveBeenCalledWith(
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
        service.getStaff(OTHER_USER_ID, BUSINESS_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.staffMember.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createStaffMember ─────────────────────────────────────────────────────

  describe('createStaffMember', () => {
    const createDto = {
      displayName: 'Alice',
      businessUserId: STAFF_BU_ID,
      serviceIds: ['svc-1'],
    };

    it('OWNER can create a staff member with businessUserId and serviceIds', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership); // caller access
      mockPrisma.businessUser.findFirst.mockResolvedValue(mockStaffMembership); // BU in business, ACTIVE
      mockPrisma.staffMember.findUnique.mockResolvedValue(null); // no duplicate
      mockPrisma.service.findMany.mockResolvedValue([mockService]); // services valid
      mockPrisma.staffMember.create.mockResolvedValue(mockStaffMember);
      mockPrisma.staffMemberService.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createStaffMember(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.staffMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            displayName: 'Alice',
            businessUserId: STAFF_BU_ID,
          }),
        }),
      );
      expect(mockPrisma.staffMemberService.createMany).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'sm-1',
        displayName: 'Alice',
        businessUserId: STAFF_BU_ID,
        serviceIds: ['svc-1'],
      });
    });

    it('STAFF cannot create a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.staffMember.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when businessUserId does not belong to this business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(null); // BU not in business

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.staffMember.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when businessUserId already has a StaffMember', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(mockStaffMembership);
      mockPrisma.staffMember.findUnique.mockResolvedValue(mockStaffMember); // already exists

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.staffMember.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a serviceId does not belong to this business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.businessUser.findFirst.mockResolvedValue(mockStaffMembership);
      mockPrisma.staffMember.findUnique.mockResolvedValue(null);
      mockPrisma.service.findMany.mockResolvedValue([]); // service not found in this business

      await expect(
        service.createStaffMember(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateStaffMember ─────────────────────────────────────────────────────

  describe('updateStaffMember', () => {
    const updateDto = { displayName: 'Alice Updated' };

    const existingStaffRow = {
      id: 'sm-1',
      isActive: true,
      businessUserId: STAFF_BU_ID,
      services: [{ serviceId: 'svc-1' }],
    };

    it('OWNER can update a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(
        existingStaffRow as unknown as StaffMember,
      );
      mockPrisma.staffMember.update.mockResolvedValue(mockStaffMemberRow);

      const result = await service.updateStaffMember(
        USER_ID,
        BUSINESS_ID,
        'sm-1',
        updateDto,
      );

      expect(mockPrisma.staffMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sm-1' } }),
      );
      expect(result).toMatchObject({ id: 'sm-1' });
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

    it('replaces services when serviceIds provided', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(
        existingStaffRow as unknown as StaffMember,
      );
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.staffMemberService.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.staffMemberService.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.staffMember.update.mockResolvedValue(mockStaffMemberRow);

      await service.updateStaffMember(USER_ID, BUSINESS_ID, 'sm-1', {
        serviceIds: ['svc-1'],
      });

      expect(mockPrisma.staffMemberService.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.staffMemberService.createMany).toHaveBeenCalled();
    });
  });

  // ─── setStaffMemberStatus ──────────────────────────────────────────────────

  describe('setStaffMemberStatus', () => {
    const existingStaffRow = {
      id: 'sm-1',
      businessUserId: STAFF_BU_ID,
      services: [{ serviceId: 'svc-1' }],
    };

    it('can deactivate a staff member', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue(
        existingStaffRow as unknown as StaffMember,
      );
      mockPrisma.staffMember.update.mockResolvedValue({
        ...mockStaffMemberRow,
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

    it('cannot activate a staff member with no services', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.staffMember.findFirst.mockResolvedValue({
        ...existingStaffRow,
        services: [],
      } as unknown as StaffMember);

      await expect(
        service.setStaffMemberStatus(USER_ID, BUSINESS_ID, 'sm-1', true),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.staffMember.update).not.toHaveBeenCalled();
    });

    it('cannot activate a staff member whose BusinessUser is not ACTIVE', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // caller access
        .mockResolvedValueOnce({
          status: 'INVITED',
        } as unknown as BusinessUser); // staff's BU
      mockPrisma.staffMember.findFirst.mockResolvedValue(
        existingStaffRow as unknown as StaffMember,
      );

      await expect(
        service.setStaffMemberStatus(USER_ID, BUSINESS_ID, 'sm-1', true),
      ).rejects.toThrow(BadRequestException);
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

  // ─── createBusinessUser ────────────────────────────────────────────────────

  describe('createBusinessUser', () => {
    const createDto = {
      phone: '052-990-0099',
      email: 'new@example.com',
      role: 'STAFF' as const,
    };

    it('OWNER can create a STAFF BusinessUser — creates new User when phone is new', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // assertMutationAccess
        .mockResolvedValueOnce(null); // no existing BusinessUser
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.staffMember.findUnique.mockResolvedValue(null);

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
            role: 'STAFF',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result).toMatchObject({
        id: 'bu-new',
        userId: 'user-new',
        businessId: BUSINESS_ID,
        role: 'STAFF',
        status: 'ACTIVE',
        phoneNormalized: '+972529900099',
        email: 'new@example.com',
        staffMemberId: null,
      });
    });

    it('reuses existing User when phone already exists globally', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.staffMember.findUnique.mockResolvedValue(null);

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

    it('STAFF cannot create a BusinessUser', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('MANAGER can create a STAFF BusinessUser', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockManagerMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.staffMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, createDto),
      ).resolves.toMatchObject({ id: 'bu-new', role: 'STAFF' });
    });

    it('includes staffMemberId when a StaffMember already exists for the BusinessUser', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockNewUser);
      mockPrisma.businessUser.create.mockResolvedValue(mockNewBu);
      mockPrisma.staffMember.findUnique.mockResolvedValue({
        id: 'sm-existing',
      } as StaffMember);

      const result = await service.createBusinessUser(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(result.staffMemberId).toBe('sm-existing');
    });

    it('throws BadRequestException for an invalid phone number', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);

      await expect(
        service.createBusinessUser(USER_ID, BUSINESS_ID, {
          phone: 'not-a-phone',
          role: 'STAFF',
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
      mockPrisma.staffMember.findUnique.mockResolvedValue(null);

      await service.createBusinessUser(USER_ID, BUSINESS_ID, {
        phone: '052-990-0099',
        role: 'STAFF',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });
  });
});
