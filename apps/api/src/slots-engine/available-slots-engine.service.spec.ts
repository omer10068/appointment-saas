import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BusinessUserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingValidationService } from '../dashboard/booking-validation.service';
import { AvailableSlotsEngineService } from './available-slots-engine.service';

const BUSINESS_ID = 'b1000000-0000-0000-0000-000000000001';
const TIMEZONE = 'Asia/Jerusalem';
const SERVICE_ID = 's1000000-0000-0000-0000-000000000001';
const SP_ID = 'p1000000-0000-0000-0000-000000000001';
const SP_USER_ID = 'u1000000-0000-0000-0000-000000000002';

const QUERY_BASE = {
  serviceId: SERVICE_ID,
  serviceProviderId: SP_ID,
  date: '2030-07-01', // Monday
};

function makeMockPrisma() {
  return {
    businessUser: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    service: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    serviceProvider: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    serviceProviderService: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    appointment: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    },
  };
}

function makeMockBookingValidation() {
  return {
    resolveWindow: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
}

describe('AvailableSlotsEngineService', () => {
  let engine: AvailableSlotsEngineService;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let mockBookingValidation: ReturnType<typeof makeMockBookingValidation>;

  beforeEach(async () => {
    mockPrisma = makeMockPrisma();
    mockBookingValidation = makeMockBookingValidation();

    const module = await Test.createTestingModule({
      providers: [
        AvailableSlotsEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BookingValidationService, useValue: mockBookingValidation },
      ],
    }).compile();

    engine = module.get(AvailableSlotsEngineService);
  });

  function setupHappyPath(
    overrides: {
      bizWindow?: unknown;
      spWindow?: unknown;
      appointments?: unknown[];
      durationMinutes?: number;
    } = {},
  ) {
    (
      mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
    ).mockResolvedValueOnce({
      id: SERVICE_ID,
      durationMinutes: overrides.durationMinutes ?? 60,
      isActive: true,
    });

    (
      mockPrisma.serviceProvider.findFirst as ReturnType<typeof jest.fn>
    ).mockResolvedValueOnce({
      id: SP_ID,
      isActive: true,
      businessUserId: SP_USER_ID,
    });

    (
      mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
    ).mockResolvedValueOnce({ status: BusinessUserStatus.ACTIVE });

    (
      mockPrisma.serviceProviderService.findFirst as ReturnType<typeof jest.fn>
    ).mockResolvedValueOnce({ serviceProviderId: SP_ID });

    (mockBookingValidation.resolveWindow as ReturnType<typeof jest.fn>)
      .mockResolvedValueOnce(
        overrides.bizWindow ?? {
          open: true,
          startMin: 8 * 60,
          endMin: 17 * 60,
        },
      )
      .mockResolvedValueOnce(
        overrides.spWindow ?? { open: true, startMin: 8 * 60, endMin: 17 * 60 },
      );

    (
      mockPrisma.appointment.findMany as ReturnType<typeof jest.fn>
    ).mockResolvedValueOnce(overrides.appointments ?? []);
  }

  describe('service / SP validation', () => {
    it('throws NotFoundException when service not found', async () => {
      (
        mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce(null);

      await expect(
        engine.computeSlots(BUSINESS_ID, TIMEZONE, QUERY_BASE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when service is inactive', async () => {
      (
        mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SERVICE_ID,
        durationMinutes: 60,
        isActive: false,
      });

      await expect(
        engine.computeSlots(BUSINESS_ID, TIMEZONE, QUERY_BASE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when SP not found', async () => {
      (
        mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SERVICE_ID,
        durationMinutes: 60,
        isActive: true,
      });
      (
        mockPrisma.serviceProvider.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce(null);

      await expect(
        engine.computeSlots(BUSINESS_ID, TIMEZONE, QUERY_BASE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when SP's business user is BLOCKED", async () => {
      (
        mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SERVICE_ID,
        durationMinutes: 60,
        isActive: true,
      });
      (
        mockPrisma.serviceProvider.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SP_ID,
        isActive: true,
        businessUserId: SP_USER_ID,
      });
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({ status: BusinessUserStatus.BLOCKED });

      await expect(
        engine.computeSlots(BUSINESS_ID, TIMEZONE, QUERY_BASE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when SP does not offer the service', async () => {
      (
        mockPrisma.service.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SERVICE_ID,
        durationMinutes: 60,
        isActive: true,
      });
      (
        mockPrisma.serviceProvider.findFirst as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        id: SP_ID,
        isActive: true,
        businessUserId: SP_USER_ID,
      });
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({ status: BusinessUserStatus.ACTIVE });
      (
        mockPrisma.serviceProviderService.findFirst as ReturnType<
          typeof jest.fn
        >
      ).mockResolvedValueOnce(null);

      await expect(
        engine.computeSlots(BUSINESS_ID, TIMEZONE, QUERY_BASE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('window resolution', () => {
    it('returns empty slots when business window is closed', async () => {
      setupHappyPath({ bizWindow: { open: false } });

      const result = await engine.computeSlots(
        BUSINESS_ID,
        TIMEZONE,
        QUERY_BASE,
      );
      expect(result.slots).toHaveLength(0);
    });

    it('returns empty slots when SP window is closed', async () => {
      setupHappyPath({ spWindow: { open: false } });

      const result = await engine.computeSlots(
        BUSINESS_ID,
        TIMEZONE,
        QUERY_BASE,
      );
      expect(result.slots).toHaveLength(0);
    });

    it('intersects biz and SP windows (SP is narrower)', async () => {
      // Biz 08:00-17:00, SP 10:00-12:00 → effective 10:00-12:00, duration=60 → 2 slots
      setupHappyPath({
        spWindow: { open: true, startMin: 10 * 60, endMin: 12 * 60 },
        durationMinutes: 60,
      });

      const result = await engine.computeSlots(BUSINESS_ID, TIMEZONE, {
        ...QUERY_BASE,
        intervalMinutes: 60,
      });
      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].localStartTime).toBe('10:00');
      expect(result.slots[1].localStartTime).toBe('11:00');
    });
  });

  describe('slot generation', () => {
    it('generates correct number of slots for 60-min duration, 60-min interval over 2h window', async () => {
      setupHappyPath({
        bizWindow: { open: true, startMin: 10 * 60, endMin: 12 * 60 },
        spWindow: { open: true, startMin: 10 * 60, endMin: 12 * 60 },
        durationMinutes: 60,
      });

      const result = await engine.computeSlots(BUSINESS_ID, TIMEZONE, {
        ...QUERY_BASE,
        intervalMinutes: 60,
      });
      expect(result.slots).toHaveLength(2);
    });

    it('excludes a slot that conflicts with an existing appointment', async () => {
      // Window 10:00-12:00, duration=60, interval=60 → candidates: 10:00 and 11:00
      // Appointment covers 10:00-11:00 → only 11:00 slot remains
      setupHappyPath({
        bizWindow: { open: true, startMin: 10 * 60, endMin: 12 * 60 },
        spWindow: { open: true, startMin: 10 * 60, endMin: 12 * 60 },
        durationMinutes: 60,
        appointments: [
          {
            startsAt: new Date('2030-07-01T07:00:00.000Z'), // 10:00 Jerusalem (UTC+3)
            endsAt: new Date('2030-07-01T08:00:00.000Z'), // 11:00 Jerusalem
          },
        ],
      });

      const result = await engine.computeSlots(BUSINESS_ID, TIMEZONE, {
        ...QUERY_BASE,
        intervalMinutes: 60,
      });
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].localStartTime).toBe('11:00');
    });

    it('uses default interval of 15 minutes when not specified', async () => {
      setupHappyPath({
        bizWindow: { open: true, startMin: 10 * 60, endMin: 11 * 60 },
        spWindow: { open: true, startMin: 10 * 60, endMin: 11 * 60 },
        durationMinutes: 30,
      });

      const result = await engine.computeSlots(
        BUSINESS_ID,
        TIMEZONE,
        QUERY_BASE,
      );
      // 10:00-11:00 window, 30min duration, 15min interval
      // candidates: 10:00, 10:15, 10:30 (10:45 would end at 11:15 — excluded)
      expect(result.slots).toHaveLength(3);
      expect(result.durationMinutes).toBe(30);
      expect(result.intervalMinutes).toBe(15);
    });

    it('returns correct response shape on happy path', async () => {
      setupHappyPath({
        bizWindow: { open: true, startMin: 9 * 60, endMin: 10 * 60 },
        spWindow: { open: true, startMin: 9 * 60, endMin: 10 * 60 },
        durationMinutes: 60,
      });

      const result = await engine.computeSlots(BUSINESS_ID, TIMEZONE, {
        ...QUERY_BASE,
        intervalMinutes: 60,
      });
      expect(result.date).toBe(QUERY_BASE.date);
      expect(result.timezone).toBe(TIMEZONE);
      expect(result.serviceId).toBe(SERVICE_ID);
      expect(result.serviceProviderId).toBe(SP_ID);
      expect(result.slots[0]).toMatchObject({
        localStartTime: '09:00',
        localEndTime: '10:00',
      });
      expect(result.slots[0].startsAt).toBeInstanceOf(Date);
    });
  });
});
