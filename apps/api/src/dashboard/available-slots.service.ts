import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BusinessStatus,
  BusinessUserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingValidationService,
  WindowResult,
  dayOfWeekFromLocalDate,
  localMinutesToUtc,
} from './booking-validation.service';
import type { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';

export interface AvailableSlotItem {
  startsAt: Date;
  endsAt: Date;
  localStartTime: string;
  localEndTime: string;
}

export interface AvailableSlotsResponseDto {
  date: string;
  timezone: string;
  serviceId: string;
  serviceProviderId: string;
  durationMinutes: number;
  intervalMinutes: number;
  slots: AvailableSlotItem[];
}

const ALLOWED_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.ACTIVE,
  BusinessStatus.TRIAL,
];

const CANCELLED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED_BY_CUSTOMER,
  AppointmentStatus.CANCELLED_BY_BUSINESS,
];

const DEFAULT_INTERVAL_MINUTES = 15;

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function intersectWindows(a: WindowResult, b: WindowResult): WindowResult {
  if (!a.open || !b.open) return { open: false };
  const startMin = Math.max(a.startMin, b.startMin);
  const endMin = Math.min(a.endMin, b.endMin);
  if (startMin >= endMin) return { open: false };
  return { open: true, startMin, endMin };
}

@Injectable()
export class AvailableSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingValidation: BookingValidationService,
  ) {}

  async getAvailableSlots(
    userId: string,
    businessId: string,
    query: AvailableSlotsQueryDto,
  ): Promise<AvailableSlotsResponseDto> {
    const { serviceId, serviceProviderId, date } = query;
    const intervalMinutes = query.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES;

    const { timezone } = await this.assertAccess(userId, businessId);

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true, durationMinutes: true, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (!service.isActive)
      throw new BadRequestException('Service is not active');

    const sp = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: { id: true, isActive: true, businessUserId: true },
    });
    if (!sp) throw new NotFoundException('Service provider not found');
    if (!sp.isActive)
      throw new BadRequestException('Service provider is not active');

    const spUser = await this.prisma.businessUser.findUnique({
      where: { id: sp.businessUserId },
      select: { status: true },
    });
    if (!spUser || spUser.status !== BusinessUserStatus.ACTIVE) {
      throw new BadRequestException(
        "Service provider's linked user account is not active",
      );
    }

    const link = await this.prisma.serviceProviderService.findFirst({
      where: { serviceProviderId, serviceId },
      select: { serviceProviderId: true },
    });
    if (!link) {
      throw new BadRequestException(
        'Service provider does not offer the selected service',
      );
    }

    const dayOfWeek = dayOfWeekFromLocalDate(date);

    const bizWindow = await this.bookingValidation.resolveWindow(
      businessId,
      null,
      date,
      dayOfWeek,
    );
    const spWindow = await this.bookingValidation.resolveWindow(
      businessId,
      serviceProviderId,
      date,
      dayOfWeek,
    );

    const effectiveWindow = intersectWindows(bizWindow, spWindow);

    if (!effectiveWindow.open) {
      return {
        date,
        timezone,
        serviceId,
        serviceProviderId,
        durationMinutes: service.durationMinutes,
        intervalMinutes,
        slots: [],
      };
    }

    const { startMin, endMin } = effectiveWindow;
    const winStartUtc = localMinutesToUtc(date, startMin, timezone);
    const winEndUtc = localMinutesToUtc(date, endMin, timezone);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        serviceProviderId,
        status: { notIn: CANCELLED_STATUSES },
        startsAt: { lt: winEndUtc },
        endsAt: { gt: winStartUtc },
      },
      select: { startsAt: true, endsAt: true },
    });

    const slots: AvailableSlotItem[] = [];
    let cursor = startMin;

    while (cursor + service.durationMinutes <= endMin) {
      const slotStartMin = cursor;
      const slotEndMin = cursor + service.durationMinutes;
      const slotStartUtc = localMinutesToUtc(date, slotStartMin, timezone);
      const slotEndUtc = localMinutesToUtc(date, slotEndMin, timezone);

      const hasConflict = existingAppointments.some(
        (apt) => apt.startsAt < slotEndUtc && apt.endsAt > slotStartUtc,
      );

      if (!hasConflict) {
        slots.push({
          startsAt: slotStartUtc,
          endsAt: slotEndUtc,
          localStartTime: minutesToHHMM(slotStartMin),
          localEndTime: minutesToHHMM(slotEndMin),
        });
      }

      cursor += intervalMinutes;
    }

    return {
      date,
      timezone,
      serviceId,
      serviceProviderId,
      durationMinutes: service.durationMinutes,
      intervalMinutes,
      slots,
    };
  }

  private async assertAccess(
    userId: string,
    businessId: string,
  ): Promise<{ timezone: string }> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { status: true },
    });
    if (!membership || membership.status !== BusinessUserStatus.ACTIVE)
      throw new ForbiddenException();

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { status: true, timezone: true },
    });
    if (!business || !ALLOWED_BUSINESS_STATUSES.includes(business.status))
      throw new ForbiddenException();

    return { timezone: business.timezone };
  }
}
