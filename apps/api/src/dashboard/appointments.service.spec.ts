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
  StaffMember,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const BUSINESS_ID = 'biz-1';
const APPOINTMENT_ID = 'appt-1';
const STAFF_ID = 'sm-1';
const STAFF_BU_ID = 'bu-3'; // BusinessUser linked to the StaffMember
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

const mockStaffMembership: BusinessUser = {
  ...mockMembership,
  id: STAFF_BU_ID,
  role: 'MEMBER',
};

const mockStaffBu = { status: 'ACTIVE' };

const mockStaffRecord: StaffMember = {
  id: STAFF_ID,
  businessId: BUSINESS_ID,
  businessUserId: STAFF_BU_ID,
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

const STARTS_AT = new Date('2024-06-15T09:00:00.000Z');
const ENDS_AT = new Date('2024-06-15T10:00:00.000Z');

const mockAppointmentRow = {
  id: APPOINTMENT_ID,
  businessId: BUSINESS_ID,
  businessCustomerId: CUSTOMER_ID,
  serviceId: SERVICE_ID,
  staffMemberId: STAFF_ID,
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  status: 'SCHEDULED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  businessCustomer: { customerProfile: { fullName: 'John Doe' } },
  service: { name: 'Haircut' },
  staffMember: { displayName: 'Alice' },
};

const mockAppointment: Appointment = {
  id: APPOINTMENT_ID,
  businessId: BUSINESS_ID,
  businessCustomerId: CUSTOMER_ID,
  serviceId: SERVICE_ID,
  staffMemberId: STAFF_ID,
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  status: 'SCHEDULED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  businessUser: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<BusinessUser | null>>(),
  },
  staffMember: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<StaffMember | null>>(),
  },
  staffMemberService: {
    findFirst:
      jest.fn<
        (...args: unknown[]) => Promise<{ staffMemberId: string } | null>
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
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
        staffMemberName: 'Alice',
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
      staffMemberId: STAFF_ID,
      startsAt: STARTS_AT.toISOString(),
    };

    function setupHappyPath() {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership) // assertMutationAccess
        .mockResolvedValueOnce(mockStaffBu as unknown as BusinessUser); // assertStaffReadyForBooking
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.staffMember.findFirst.mockResolvedValue(mockStaffRecord);
      mockPrisma.staffMemberService.findFirst.mockResolvedValue({
        staffMemberId: STAFF_ID,
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
            staffMemberId: STAFF_ID,
            status: 'SCHEDULED',
            endsAt: ENDS_AT,
          }),
        }),
      );
      expect(result.customerName).toBe('John Doe');
    });

    it('throws ForbiddenException for MEMBER role', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ForbiddenException);
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

    it('throws NotFoundException when staff does not belong to business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.staffMember.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when staff is inactive', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.staffMember.findFirst.mockResolvedValue({
        ...mockStaffRecord,
        isActive: false,
      });

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when staff's linked user account is not active", async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce({
          status: 'INVITED',
        } as unknown as BusinessUser);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.staffMember.findFirst.mockResolvedValue(mockStaffRecord);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when staff does not provide the selected service', async () => {
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockStaffBu as unknown as BusinessUser);
      mockPrisma.service.findFirst.mockResolvedValue(mockService);
      mockPrisma.businessCustomer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.staffMember.findFirst.mockResolvedValue(mockStaffRecord);
      mockPrisma.staffMemberService.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when staff has overlapping appointment', async () => {
      setupHappyPath();
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment); // conflict

      await expect(
        service.createAppointment(USER_ID, BUSINESS_ID, createDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateAppointment ────────────────────────────────────────────────────

  describe('updateAppointment', () => {
    it('OWNER can update an appointment (no field changes)', async () => {
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
        {},
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: APPOINTMENT_ID } }),
      );
      expect(result.id).toBe(APPOINTMENT_ID);
    });

    it('throws NotFoundException for appointment from another business', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when updating a closed appointment', async () => {
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'COMPLETED',
      });

      await expect(
        service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('recomputes endsAt when startsAt changes', async () => {
      const newStartsAt = new Date('2024-06-15T11:00:00.000Z');
      const expectedEndsAt = new Date('2024-06-15T12:00:00.000Z');

      mockPrisma.businessUser.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce(null);
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

    it('validates new staff when staffMemberId changes', async () => {
      const NEW_STAFF_ID = 'sm-2';
      mockPrisma.businessUser.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockStaffBu as unknown as BusinessUser);
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce(null);
      mockPrisma.staffMember.findFirst.mockResolvedValue({
        ...mockStaffRecord,
        id: NEW_STAFF_ID,
      });
      mockPrisma.staffMemberService.findFirst.mockResolvedValue({
        staffMemberId: NEW_STAFF_ID,
      });
      mockPrisma.appointment.update.mockResolvedValue(
        mockAppointmentRow as unknown as Appointment,
      );

      await service.updateAppointment(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
        staffMemberId: NEW_STAFF_ID,
      });

      expect(mockPrisma.staffMember.findFirst).toHaveBeenCalled();
      expect(mockPrisma.staffMemberService.findFirst).toHaveBeenCalled();
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
      mockPrisma.businessUser.findUnique.mockResolvedValue(mockStaffMembership);

      await expect(
        service.setAppointmentStatus(USER_ID, BUSINESS_ID, APPOINTMENT_ID, {
          status: 'CONFIRMED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
