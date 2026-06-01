import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BusinessStatus, BusinessUserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailableSlotsEngineService } from '../slots-engine/available-slots-engine.service';
import { AvailableSlotsService } from './available-slots.service';

const BUSINESS_ID = 'b1000000-0000-0000-0000-000000000001';
const USER_ID = 'u1000000-0000-0000-0000-000000000001';
const SERVICE_ID = 's1000000-0000-0000-0000-000000000001';
const SP_ID = 'p1000000-0000-0000-0000-000000000001';

const QUERY_BASE = {
  serviceId: SERVICE_ID,
  serviceProviderId: SP_ID,
  date: '2030-07-01',
};

const ENGINE_RESULT = {
  date: '2030-07-01',
  timezone: 'Asia/Jerusalem',
  serviceId: SERVICE_ID,
  serviceProviderId: SP_ID,
  durationMinutes: 60,
  intervalMinutes: 15,
  slots: [],
};

function makeMockPrisma() {
  return {
    businessUser: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    business: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
}

function makeMockEngine() {
  return {
    computeSlots: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
}

describe('AvailableSlotsService', () => {
  let service: AvailableSlotsService;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let mockEngine: ReturnType<typeof makeMockEngine>;

  beforeEach(async () => {
    mockPrisma = makeMockPrisma();
    mockEngine = makeMockEngine();

    const module = await Test.createTestingModule({
      providers: [
        AvailableSlotsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AvailableSlotsEngineService, useValue: mockEngine },
      ],
    }).compile();

    service = module.get(AvailableSlotsService);
  });

  describe('assertAccess', () => {
    it('throws ForbiddenException when user has no membership', async () => {
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce(null);

      await expect(
        service.getAvailableSlots(USER_ID, BUSINESS_ID, QUERY_BASE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when membership is not ACTIVE', async () => {
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({ status: BusinessUserStatus.BLOCKED });

      await expect(
        service.getAvailableSlots(USER_ID, BUSINESS_ID, QUERY_BASE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when business is SUSPENDED', async () => {
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({ status: BusinessUserStatus.ACTIVE });
      (
        mockPrisma.business.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        status: BusinessStatus.SUSPENDED,
        timezone: 'UTC',
      });

      await expect(
        service.getAvailableSlots(USER_ID, BUSINESS_ID, QUERY_BASE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('delegates to engine.computeSlots with resolved timezone on success', async () => {
      (
        mockPrisma.businessUser.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({ status: BusinessUserStatus.ACTIVE });
      (
        mockPrisma.business.findUnique as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce({
        status: BusinessStatus.ACTIVE,
        timezone: 'Asia/Jerusalem',
      });
      (
        mockEngine.computeSlots as ReturnType<typeof jest.fn>
      ).mockResolvedValueOnce(ENGINE_RESULT);

      const result = await service.getAvailableSlots(
        USER_ID,
        BUSINESS_ID,
        QUERY_BASE,
      );

      expect(mockEngine.computeSlots).toHaveBeenCalledWith(
        BUSINESS_ID,
        'Asia/Jerusalem',
        QUERY_BASE,
      );
      expect(result).toBe(ENGINE_RESULT);
    });
  });
});
