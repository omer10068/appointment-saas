import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  BookingValidationService,
  doesSlotFitWindow,
  parseTimeString,
  toDayOfWeek,
  toLocalDate,
  toMinutesSinceMidnight,
} from './booking-validation.service';

// 2024-01-15 is a Monday
const STARTS_AT = new Date('2024-01-15T09:00:00.000Z'); // UTC 09:00 = local 09:00 when tz=UTC
const ENDS_AT = new Date('2024-01-15T10:00:00.000Z'); // UTC 10:00
const BIZ_ID = 'biz-id-1';
const SP_ID = 'sp-id-1';

const BIZ_HOURS_OPEN = {
  isClosed: false,
  startTime: '08:00',
  endTime: '17:00',
};
const SP_HOURS_OPEN = { isClosed: false, startTime: '08:00', endTime: '17:00' };

function makeMockPrisma() {
  return {
    business: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    appointment: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    },
    availabilityException: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    businessWorkingHour: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    serviceProviderWorkingHour: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
}

describe('BookingValidationService', () => {
  let service: BookingValidationService;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    service = new BookingValidationService(mockPrisma as never);
  });

  // ─── Pure helpers ─────────────────────────────────────────────────────────────

  describe('toLocalDate', () => {
    it('returns YYYY-MM-DD in UTC', () => {
      expect(toLocalDate(new Date('2024-01-15T10:30:00.000Z'), 'UTC')).toBe(
        '2024-01-15',
      );
    });

    it('shifts to next calendar day when UTC date crosses midnight in UTC+9', () => {
      // 2024-01-15T23:00:00Z = 2024-01-16T08:00:00 in UTC+9 (Etc/GMT-9)
      expect(
        toLocalDate(new Date('2024-01-15T23:00:00.000Z'), 'Etc/GMT-9'),
      ).toBe('2024-01-16');
    });
  });

  describe('toDayOfWeek', () => {
    it('2024-01-15 UTC is Monday (1)', () => {
      expect(toDayOfWeek(new Date('2024-01-15T10:00:00.000Z'), 'UTC')).toBe(1);
    });

    it('2024-01-14 UTC is Sunday (0)', () => {
      expect(toDayOfWeek(new Date('2024-01-14T10:00:00.000Z'), 'UTC')).toBe(0);
    });

    it('shifts dayOfWeek when UTC Sunday becomes Monday in UTC+9', () => {
      // 2024-01-14T23:00:00Z (Sunday UTC) = 2024-01-15T08:00:00 in Etc/GMT-9 (Monday)
      expect(
        toDayOfWeek(new Date('2024-01-14T23:00:00.000Z'), 'Etc/GMT-9'),
      ).toBe(1);
    });
  });

  describe('toMinutesSinceMidnight', () => {
    it('returns 0 for midnight UTC', () => {
      expect(
        toMinutesSinceMidnight(new Date('2024-01-15T00:00:00.000Z'), 'UTC'),
      ).toBe(0);
    });

    it('returns 570 for 09:30 UTC', () => {
      expect(
        toMinutesSinceMidnight(new Date('2024-01-15T09:30:00.000Z'), 'UTC'),
      ).toBe(570);
    });

    it('adjusts for UTC+2 (Etc/GMT-2)', () => {
      // 09:30 UTC = 11:30 in Etc/GMT-2 → 690 minutes
      expect(
        toMinutesSinceMidnight(
          new Date('2024-01-15T09:30:00.000Z'),
          'Etc/GMT-2',
        ),
      ).toBe(690);
    });
  });

  describe('parseTimeString', () => {
    it('"00:00" → 0', () => expect(parseTimeString('00:00')).toBe(0));
    it('"09:30" → 570', () => expect(parseTimeString('09:30')).toBe(570));
    it('"17:00" → 1020', () => expect(parseTimeString('17:00')).toBe(1020));
    it('"23:59" → 1439', () => expect(parseTimeString('23:59')).toBe(1439));
  });

  describe('doesSlotFitWindow', () => {
    it('returns true when slot is within window', () => {
      expect(doesSlotFitWindow(540, 600, 480, 1020)).toBe(true);
    });

    it('returns false when slot starts before window', () => {
      expect(doesSlotFitWindow(540, 600, 600, 1020)).toBe(false);
    });

    it('returns false when slot ends after window', () => {
      expect(doesSlotFitWindow(540, 600, 480, 570)).toBe(false);
    });

    it('returns true when slot exactly matches window', () => {
      expect(doesSlotFitWindow(480, 1020, 480, 1020)).toBe(true);
    });
  });

  // ─── validateBookingSlot ──────────────────────────────────────────────────────

  describe('validateBookingSlot', () => {
    const params = {
      businessId: BIZ_ID,
      serviceProviderId: SP_ID,
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
    };

    function setupHappyPath() {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue(
        BIZ_HOURS_OPEN,
      );
      mockPrisma.serviceProviderWorkingHour.findUnique.mockResolvedValue(
        SP_HOURS_OPEN,
      );
    }

    it('resolves when slot fits both business and SP windows', async () => {
      setupHappyPath();
      await expect(
        service.validateBookingSlot(params),
      ).resolves.toBeUndefined();
    });

    it('returns without throwing when business is not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(
        service.validateBookingSlot(params),
      ).resolves.toBeUndefined();
    });

    it('throws when business working hours are isClosed=true', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue({
        isClosed: true,
        startTime: null,
        endTime: null,
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when no business working hours row exists (treated as closed)', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue(null);

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when slot starts before business opening', async () => {
      // Slot 09:00-10:00, biz opens 10:00
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue({
        isClosed: false,
        startTime: '10:00',
        endTime: '17:00',
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when slot ends after business closing', async () => {
      // Slot 09:00-10:00, biz closes 09:30
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue({
        isClosed: false,
        startTime: '08:00',
        endTime: '09:30',
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when SP working hours are isClosed=true', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue(
        BIZ_HOURS_OPEN,
      );
      mockPrisma.serviceProviderWorkingHour.findUnique.mockResolvedValue({
        isClosed: true,
        startTime: null,
        endTime: null,
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when slot fits business but SP window is narrower', async () => {
      // Slot 09:00-10:00, SP only works 10:00-17:00
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValue(null);
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue(
        BIZ_HOURS_OPEN,
      );
      mockPrisma.serviceProviderWorkingHour.findUnique.mockResolvedValue({
        isClosed: false,
        startTime: '10:00',
        endTime: '17:00',
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('applies business-level exception isClosed=true over open working hours', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      // First call: business-level exception → closed
      mockPrisma.availabilityException.findFirst.mockResolvedValueOnce({
        isClosed: true,
        startTime: null,
        endTime: null,
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('uses business-level exception custom hours when isClosed=false and slot fits', async () => {
      // Exception opens 08:00-11:00; slot 09:00-10:00 fits
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst
        .mockResolvedValueOnce({
          isClosed: false,
          startTime: '08:00',
          endTime: '11:00',
        })
        .mockResolvedValueOnce(null);
      mockPrisma.serviceProviderWorkingHour.findUnique.mockResolvedValue(
        SP_HOURS_OPEN,
      );

      await expect(
        service.validateBookingSlot(params),
      ).resolves.toBeUndefined();
    });

    it('rejects when slot falls outside business exception custom hours', async () => {
      // Exception opens 06:00-09:00; slot 09:00-10:00 ends at 600 > 540
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      mockPrisma.availabilityException.findFirst.mockResolvedValueOnce({
        isClosed: false,
        startTime: '06:00',
        endTime: '09:00',
      });

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('applies SP-level exception isClosed=true over open working hours', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
      // Business exception: none
      mockPrisma.availabilityException.findFirst
        .mockResolvedValueOnce(null)
        // SP exception: closed
        .mockResolvedValueOnce({
          isClosed: true,
          startTime: null,
          endTime: null,
        });
      mockPrisma.businessWorkingHour.findUnique.mockResolvedValue(
        BIZ_HOURS_OPEN,
      );

      await expect(service.validateBookingSlot(params)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── checkBusinessHoursConflict ───────────────────────────────────────────────

  describe('checkBusinessHoursConflict', () => {
    // 2030-07-01 is a Monday in UTC
    const MON_APT = {
      id: 'apt-1',
      startsAt: new Date('2030-07-01T10:00:00.000Z'),
      endsAt: new Date('2030-07-01T11:00:00.000Z'),
      serviceProviderId: 'sp-1',
      businessCustomerId: 'bc-1',
    };

    const OPEN_MONDAY = {
      dayOfWeek: 1,
      isClosed: false,
      startTime: '09:00',
      endTime: '17:00',
    };

    function setupBusiness() {
      mockPrisma.business.findUnique.mockResolvedValue({ timezone: 'UTC' });
    }

    it('resolves without throwing when business is not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(
        service.checkBusinessHoursConflict('biz-1', [OPEN_MONDAY]),
      ).resolves.toBeUndefined();
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('resolves without throwing when no future appointments exist', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await expect(
        service.checkBusinessHoursConflict('biz-1', [OPEN_MONDAY]),
      ).resolves.toBeUndefined();
    });

    it('resolves when appointment fits within proposed hours', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT]);
      // Slot 10:00-11:00 fits inside 09:00-17:00 Monday
      await expect(
        service.checkBusinessHoursConflict('biz-1', [OPEN_MONDAY]),
      ).resolves.toBeUndefined();
    });

    it('throws ConflictException when appointment is on a day set to isClosed=true', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT]);
      await expect(
        service.checkBusinessHoursConflict('biz-1', [
          { dayOfWeek: 1, isClosed: true },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when appointment day is not in proposed hours', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT]);
      // Only Tuesday defined — Monday treated as closed
      await expect(
        service.checkBusinessHoursConflict('biz-1', [
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when appointment ends after proposed closing time', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT]);
      // Monday closes at 10:30; appointment runs 10:00-11:00 → overflows
      await expect(
        service.checkBusinessHoursConflict('biz-1', [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '10:30',
          },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when appointment starts before proposed opening time', async () => {
      setupBusiness();
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT]);
      // Monday opens at 10:30; appointment starts at 10:00 → too early
      await expect(
        service.checkBusinessHoursConflict('biz-1', [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '10:30',
            endTime: '17:00',
          },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('includes all conflicting appointments in the exception payload', async () => {
      setupBusiness();
      const apt2 = {
        ...MON_APT,
        id: 'apt-2',
        startsAt: new Date('2030-07-01T13:00:00.000Z'),
        endsAt: new Date('2030-07-01T14:00:00.000Z'),
      };
      mockPrisma.appointment.findMany.mockResolvedValue([MON_APT, apt2]);
      // Monday closed → both conflict
      try {
        await service.checkBusinessHoursConflict('biz-1', [
          { dayOfWeek: 1, isClosed: true },
        ]);
        expect(true).toBe(false); // should not reach
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const body = (err as ConflictException).getResponse() as {
          conflicts: unknown[];
        };
        expect(body.conflicts).toHaveLength(2);
      }
    });
  });
});
