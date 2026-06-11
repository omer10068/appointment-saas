import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  Appointment,
  BusinessCustomer,
  BusinessUser,
  Service,
  ServiceProvider,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';
import { BookingValidationService } from './booking-validation.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const BUSINESS_ID = 'biz-1';
const APPOINTMENT_ID = 'appt-1';
const SERVICE_PROVIDER_ID = 'sp-1';
const SERVICE_PROVIDER_BU_ID = 'bu-3'; // BusinessUser linked to the ServiceProvider
const SERVICE_ID = 'svc-1';
const CUSTOMER_ID = 'bc-1';

const mockMembership: BusinessUser = {
  id: 'bu-1',
  businessId: BUSINESS_ID,
  userId: USER_ID,
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockServiceProvidership: BusinessUser = {
  ...mockMembership,
  id: SERVICE_PROVIDER_BU_ID,
  role: 'MEMBER',
};

const mockSpBu = { status: 'ACTIVE' }; // BusinessUser linked to the ServiceProvider

const mockServiceProviderRecord: ServiceProvider = {
  id: SERVICE_PROVIDER_ID,
  businessId: BUSINESS_ID,
  businessUserId: SERVICE_PROVIDER_BU_ID,
  displayName: 'Alice',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockService: Service = {
  id: SERVICE_ID,
  businessId: BUSINESS_ID,
  name: 'Haircut',
  description: null,
  durationMinutes: 60,
  priceCents: 5000,
  isActive: true,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCustomer: BusinessCustomer = {
  id: CUSTOMER_ID,
  businessId: BUSINESS_ID,
  customerProfileId: 'cp-1',
  status: 'ACTIVE',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const STARTS_AT = new Date('2030-06-15T09:00:00.000Z');
const ENDS_AT = new Date('2030-06-15T10:00:00.000Z');

const mockAppointmentRow = {
  id: APPOINTMENT_ID,
  businessId: BUSINESS_ID,
  businessCustomerId: CUSTOMER_ID,
  serviceId: SERVICE_ID,
  serviceProviderId: SERVICE_PROVIDER_ID,
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  status: 'SCHEDULED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  businessCustomer: { customerProfile: { fullName: 'John Doe' } },
  service: { name: 'Haircut' },
  serviceProvider: { displayName: 'Alice' },
};

const mockAppointment: Appointment = {
  id: APPOINTMENT_ID,
  businessId: BUSINESS_ID,
  businessCustomerId: CUSTOMER_ID,
  serviceId: SERVICE_ID,
  serviceProviderId: SERVICE_PROVIDER_ID,
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  status: 'SCHEDULED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBookingValidation = {
  validateBookingSlot: jest.fn<(...args: unknown[]) => Promise<void>>(),
};

const mockPrisma = {
  business: {
    findUnique:
      jest.fn<(...args: unknown[]) => Promise<{ status: string } | null>>(),
  },
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
  },
  serviceProvider: {
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<ServiceProvider | null>>(),
  },
  serviceProviderService: {
    findFirst:
      jest.fn<
        (...args: unknown[]) => Promise<{ serviceProviderId: string } | null>
      >(),
  },
  service: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<Service | null>>(),
  },
  businessCustomer: {
    findFirst:
      jest.fn<(...args: unknown[]) => Promise<BusinessCustomer | null>>(),
  },
  appointment: {
    findMany: jest.fn<(...args: unknown[]) => Promise<Appointment[]>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<Appointment | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<Appointment>>(),
    update: jest.fn<(...args: unknown[]) => Promise<Appointment>>(),
  },
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.business.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    mockBookingValidation.validateBookingSlot.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BookingValidationService, useValue: mockBookingValidation },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  // ─── getAppointments ──────────────────────────────────────────────────────

  describe('getAppointments', () => {
    it('returns appointments for an assigned user', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findMany.mockResolvedValue([
        mockAppointmentRow,
      ] as unknown as Appointment[]);

      const result = await service.getAppointments(USER_ID, BUSINESS_ID, {});

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: BUSINESS_ID } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: APPOINTMENT_ID,
        customerName: 'John Doe',
        serviceName: 'Haircut',
        serviceProviderName: 'Alice',
      });
    });

    it('throws ForbiddenException for non-member user', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(null);

      await expect(
        service.getAppointments(OTHER_USER_ID, BUSINESS_ID, {}),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('applies from/to filters', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.getAppointments(USER_ID, BUSINESS_ID, {
        from: '2024-06-01',
        to: '2024-06-30',
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startsAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('applies status filter', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.getAppointments(USER_ID, BUSINESS_ID, {
        status: 'CONFIRMED',
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
    });
  });

  // ─── createAppointment ────────────────────────────────────────────────────

  describe('createAppointment', () => {
    const createDto = {
      businessCustomerId: CUSTOMER_ID,
      serviceId: SERVICE_ID,
      serviceProviderId: SERVICE_PROVIDER_ID,
      startsAt: STARTS_AT.toISOString(),
    };

    function setupHappyPath() {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // assertMutationAccess
        .mockResolvedValueOnce(mockSpBu as unknown as BusinessUser); // assertStaffReadyForBooking
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProviderRecord,
      );
      mockPrisma.serviceProviderService.findFirst.mockResolvedValue({
        serviceProviderId: SERVICE_PROVIDER_ID,
      });
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // no conflict
    }

    it('OWNER can create an appointment', async () => {
      setupHappyPath();
      mockPrisma.appointment.create.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      const result = await service.createAppointment(
        USER_ID,
        BUSINESS_ID,
        createDto,
      );

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            businessCustomerId: CUSTOMER_ID,
            serviceId: SERVICE_ID,
            serviceProviderId: SERVICE_PROVIDER_ID,
            status: 'SCHEDULED',
            endsAt: ENDS_AT,
          }),
        }),
      );
      expect(result.customerName).toBe('John Doe');
    });

    it('throws ForbiddenException for MEMBER role', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for past startsAt', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, {
          ...createDto,
          startsAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.service.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when service does not belong to business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when service is inactive', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue({
        ...mockService,
        isActive: false,
      });

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when customer does not belong to business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when service provider does not belong to business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when service provider is inactive', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue({
        ...mockServiceProviderRecord,
        isActive: false,
      });

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when service provider's linked user account is not active", async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce({
          status: 'INVITED',
        } as unknown as BusinessUser);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProviderRecord,
      );

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when service provider does not offer the selected service', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockSpBu as unknown as BusinessUser);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProviderRecord,
      );
      mockPrisma.serviceProviderService.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when service provider has overlapping appointment', async () => {
      setupHappyPath();
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment); // conflict

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when same customer has overlapping appointment with a different provider', async () => {
      setupHappyPath();
      // SP conflict check passes; customer conflict check fires
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(null) // checkServiceProviderConflict: no conflict
        .mockResolvedValueOnce(mockAppointment); // checkCustomerConflict: conflict!

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('excludes cancelled appointments from the customer conflict check', async () => {
      setupHappyPath();
      mockPrisma.appointment.create.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      await service.createAppointment(USER_ID, BUSINESS_ID, createDto);

      // Verify the customer conflict query excludes cancelled statuses
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessCustomerId: CUSTOMER_ID,
            status: expect.objectContaining({
              notIn: expect.arrayContaining([
                'CANCELLED_BY_CUSTOMER',
                'CANCELLED_BY_BUSINESS',
              ]),
            }),
          }),
        }),
      );
    });
  });

  // ─── updateAppointment ────────────────────────────────────────────────────

  describe('updateAppointment', () => {
    it('OWNER can update an appointment', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment) // existing check
        .mockResolvedValueOnce(null); // conflict check
      mockPrisma.appointment.update.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      const result = await service.updateAppointment(
        USER_ID,
        BUSINESS_ID,
        APPOINTMENT_ID,
        { serviceId: SERVICE_ID },
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: APPOINTMENT_ID } }),
      );
      expect(result.id).toBe(APPOINTMENT_ID);
    });

    it('throws BadRequestException for empty DTO', async () => {
      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {}),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.businessUser.findUnique).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for past startsAt', async () => {
      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          startsAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.businessUser.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for appointment from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          serviceId: SERVICE_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when updating a closed appointment', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'COMPLETED',
      });

      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          serviceId: SERVICE_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recomputes endsAt when startsAt changes', async () => {
      const newStartsAt = new Date('2030-06-15T11:00:00.000Z');
      const expectedEndsAt = new Date('2030-06-15T12:00:00.000Z');

      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment) // fetch existing
        .mockResolvedValueOnce(null) // SP conflict check
        .mockResolvedValueOnce(null); // customer conflict check
      mockPrisma.appointment.update.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      await service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
        startsAt: newStartsAt.toISOString(),
      });

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startsAt: newStartsAt,
            endsAt: expectedEndsAt,
          }),
        }),
      );
    });

    it('validates new service provider when serviceProviderId changes', async () => {
      const NEW_SERVICE_PROVIDER_ID = 'sm-2';
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockSpBu as unknown as BusinessUser);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce(null);
      mockPrisma.serviceProvider.findFirst.mockResolvedValue({
        ...mockServiceProviderRecord,
        id: NEW_SERVICE_PROVIDER_ID,
      });
      mockPrisma.serviceProviderService.findFirst.mockResolvedValue({
        serviceProviderId: NEW_SERVICE_PROVIDER_ID,
      });
      mockPrisma.appointment.update.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      await service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
        serviceProviderId: NEW_SERVICE_PROVIDER_ID,
      });

      expect(mockPrisma.serviceProvider.findFirst).toHaveBeenCalled();
      expect(mockPrisma.serviceProviderService.findFirst).toHaveBeenCalled();
    });

    it('throws ConflictException when rescheduled appointment causes customer time overlap', async () => {
      const newStartsAt = new Date('2030-06-15T11:00:00.000Z');

      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment) // fetch existing
        .mockResolvedValueOnce(null) // SP conflict: ok
        .mockResolvedValueOnce(mockAppointment); // customer conflict: conflict!

      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          startsAt: newStartsAt.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('update excludes the current appointment itself from the customer conflict check', async () => {
      const newStartsAt = new Date('2030-06-15T11:00:00.000Z');

      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce(null) // SP conflict
        .mockResolvedValueOnce(null); // customer conflict: self excluded, no other conflict
      mockPrisma.appointment.update.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      await service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
        startsAt: newStartsAt.toISOString(),
      });

      // Customer conflict query must exclude the appointment being updated
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessCustomerId: CUSTOMER_ID,
            id: { not: APPOINTMENT_ID },
          }),
        }),
      );
    });
  });

  // ─── setAppointmentStatus ─────────────────────────────────────────────────

  describe('setAppointmentStatus', () => {
    it('OWNER can update appointment status', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointmentRow,
        status: 'CONFIRMED',
      } as unknown as Appointment);

      const result = await service.setAppointmentStatus(
        USER_ID,
        BUSINESS_ID,
        APPOINTMENT_ID,
        { status: 'CONFIRMED' },
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: APPOINTMENT_ID },
          data: { status: 'CONFIRMED' },
        }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException for appointment from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          status: 'CONFIRMED',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for MEMBER role', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(
        mockServiceProvidership,
      );

      await expect(
        service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          status: 'CONFIRMED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each([
      'COMPLETED',
      'CANCELLED_BY_CUSTOMER',
      'CANCELLED_BY_BUSINESS',
      'NO_SHOW',
    ] as const)(
      'throws BadRequestException when appointment is already %s',
      async (terminalStatus) => {
        mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
        mockPrisma.appointment.findFirst.mockResolvedValue({
          ...mockAppointment,
          status: terminalStatus,
        });

        await expect(
          service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
            status: 'SCHEDULED',
          }),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
      },
    );

    // ── Time-based rules ──────────────────────────────────────────────────────

    const PAST_DATE = new Date('2020-01-01T09:00:00.000Z');
    const FUTURE_DATE = new Date('2030-06-15T09:00:00.000Z');

    it.each(['COMPLETED', 'NO_SHOW'] as const)(
      'throws BadRequestException when marking future appointment as %s',
      async (status) => {
        mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
        mockPrisma.appointment.findFirst.mockResolvedValue({
          ...mockAppointment,
          startsAt: FUTURE_DATE,
          status: 'SCHEDULED',
        });

        await expect(
          service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
            status,
          }),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
      },
    );

    it('throws BadRequestException when cancelling an appointment that has already started', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        startsAt: PAST_DATE,
        status: 'SCHEDULED',
      });

      await expect(
        service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          status: 'CANCELLED_BY_BUSINESS',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it('allows CANCELLED_BY_BUSINESS for a future appointment', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        startsAt: FUTURE_DATE,
        status: 'SCHEDULED',
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointmentRow,
        status: 'CANCELLED_BY_BUSINESS',
      } as unknown as Appointment);

      await expect(
        service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          status: 'CANCELLED_BY_BUSINESS',
        }),
      ).resolves.toBeDefined();
    });

    it.each(['COMPLETED', 'NO_SHOW'] as const)(
      'allows %s for an appointment that has already started',
      async (status) => {
        mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
        mockPrisma.appointment.findFirst.mockResolvedValue({
          ...mockAppointment,
          startsAt: PAST_DATE,
          status: 'SCHEDULED',
        });
        mockPrisma.appointment.update.mockResolvedValue({
          ...mockAppointmentRow,
          status,
        });

        await expect(
          service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
            status,
          }),
        ).resolves.toBeDefined();
      },
    );
  });
});
