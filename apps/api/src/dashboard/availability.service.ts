import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingValidationService } from './booking-validation.service';
import type { UpsertWorkingHoursDto } from './dto/upsert-working-hours.dto';
import type { CreateAvailabilityExceptionDto } from './dto/create-availability-exception.dto';
import type { UpdateAvailabilityExceptionDto } from './dto/update-availability-exception.dto';

export interface WorkingHourDto {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
}

export interface AvailabilityExceptionDto {
  id: string;
  businessId: string;
  serviceProviderId: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: Date;
}

const WORKING_HOUR_SELECT = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  isClosed: true,
} as const;

const EXCEPTION_SELECT = {
  id: true,
  businessId: true,
  serviceProviderId: true,
  date: true,
  startTime: true,
  endTime: true,
  isClosed: true,
  reason: true,
  createdAt: true,
} as const;

const ALLOWED_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.ACTIVE,
  BusinessStatus.TRIAL,
];

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingValidation: BookingValidationService,
  ) {}

  // ─── Business working hours ───────────────────────────────────────────────────

  async getBusinessWorkingHours(
    userId: string,
    businessId: string,
  ): Promise<WorkingHourDto[]> {
    await this.assertAccess(userId, businessId);
    return this.prisma.businessWorkingHour.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' },
      select: WORKING_HOUR_SELECT,
    });
  }

  async setBusinessWorkingHours(
    userId: string,
    businessId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHourDto[]> {
    await this.assertMutationAccess(userId, businessId);
    this.validateHoursPayload(dto.hours);
    await this.bookingValidation.checkBusinessHoursConflict(
      businessId,
      dto.hours,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.businessWorkingHour.deleteMany({ where: { businessId } });
      await tx.businessWorkingHour.createMany({
        data: dto.hours.map((h) => ({
          businessId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.isClosed ? null : (h.startTime ?? null),
          endTime: h.isClosed ? null : (h.endTime ?? null),
          isClosed: h.isClosed,
        })),
      });
      return tx.businessWorkingHour.findMany({
        where: { businessId },
        orderBy: { dayOfWeek: 'asc' },
        select: WORKING_HOUR_SELECT,
      });
    });
  }

  // ─── Service provider working hours ──────────────────────────────────────────

  async getServiceProviderWorkingHours(
    userId: string,
    businessId: string,
    serviceProviderId: string,
  ): Promise<WorkingHourDto[]> {
    await this.assertAccess(userId, businessId);
    await this.assertServiceProviderInBusiness(serviceProviderId, businessId);
    return this.prisma.serviceProviderWorkingHour.findMany({
      where: { serviceProviderId, businessId },
      orderBy: { dayOfWeek: 'asc' },
      select: WORKING_HOUR_SELECT,
    });
  }

  async setServiceProviderWorkingHours(
    userId: string,
    businessId: string,
    serviceProviderId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHourDto[]> {
    await this.assertMutationAccess(userId, businessId);
    await this.assertServiceProviderInBusiness(serviceProviderId, businessId);
    this.validateHoursPayload(dto.hours);
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceProviderWorkingHour.deleteMany({
        where: { serviceProviderId },
      });
      await tx.serviceProviderWorkingHour.createMany({
        data: dto.hours.map((h) => ({
          businessId,
          serviceProviderId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.isClosed ? null : (h.startTime ?? null),
          endTime: h.isClosed ? null : (h.endTime ?? null),
          isClosed: h.isClosed,
        })),
      });
      return tx.serviceProviderWorkingHour.findMany({
        where: { serviceProviderId },
        orderBy: { dayOfWeek: 'asc' },
        select: WORKING_HOUR_SELECT,
      });
    });
  }

  // ─── Availability exceptions ──────────────────────────────────────────────────

  async getAvailabilityExceptions(
    userId: string,
    businessId: string,
  ): Promise<AvailabilityExceptionDto[]> {
    await this.assertAccess(userId, businessId);
    return this.prisma.availabilityException.findMany({
      where: { businessId },
      orderBy: { date: 'asc' },
      select: EXCEPTION_SELECT,
    });
  }

  async createAvailabilityException(
    userId: string,
    businessId: string,
    dto: CreateAvailabilityExceptionDto,
  ): Promise<AvailabilityExceptionDto> {
    await this.assertMutationAccess(userId, businessId);
    if (dto.serviceProviderId) {
      await this.assertServiceProviderInBusiness(
        dto.serviceProviderId,
        businessId,
      );
    }
    if (!dto.isClosed) {
      this.validateTimeRange(dto.startTime ?? null, dto.endTime ?? null);
    }
    return this.prisma.availabilityException.create({
      data: {
        businessId,
        serviceProviderId: dto.serviceProviderId ?? null,
        date: new Date(dto.date),
        isClosed: dto.isClosed,
        startTime: dto.isClosed ? null : (dto.startTime ?? null),
        endTime: dto.isClosed ? null : (dto.endTime ?? null),
        reason: dto.reason ?? null,
      },
      select: EXCEPTION_SELECT,
    });
  }

  async updateAvailabilityException(
    userId: string,
    businessId: string,
    exceptionId: string,
    dto: UpdateAvailabilityExceptionDto,
  ): Promise<AvailabilityExceptionDto> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.availabilityException.findFirst({
      where: { id: exceptionId, businessId },
      select: { id: true, isClosed: true, startTime: true, endTime: true },
    });
    if (!existing)
      throw new NotFoundException('Availability exception not found');

    if (dto.serviceProviderId) {
      await this.assertServiceProviderInBusiness(
        dto.serviceProviderId,
        businessId,
      );
    }

    const isClosed = dto.isClosed ?? existing.isClosed;
    const startTime =
      dto.startTime !== undefined ? dto.startTime : existing.startTime;
    const endTime = dto.endTime !== undefined ? dto.endTime : existing.endTime;
    if (!isClosed) {
      this.validateTimeRange(startTime ?? null, endTime ?? null);
    }

    return this.prisma.availabilityException.update({
      where: { id: exceptionId },
      data: {
        ...(dto.serviceProviderId !== undefined && {
          serviceProviderId: dto.serviceProviderId,
        }),
        ...(dto.isClosed !== undefined && { isClosed: dto.isClosed }),
        ...(dto.startTime !== undefined && {
          startTime: isClosed ? null : dto.startTime,
        }),
        ...(dto.endTime !== undefined && {
          endTime: isClosed ? null : dto.endTime,
        }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
      },
      select: EXCEPTION_SELECT,
    });
  }

  async deleteAvailabilityException(
    userId: string,
    businessId: string,
    exceptionId: string,
  ): Promise<void> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.availabilityException.findFirst({
      where: { id: exceptionId, businessId },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException('Availability exception not found');
    await this.prisma.availabilityException.delete({
      where: { id: exceptionId },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async assertAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!membership || membership.status !== BusinessUserStatus.ACTIVE)
      throw new ForbiddenException();
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { status: true },
    });
    if (!business || !ALLOWED_BUSINESS_STATUSES.includes(business.status))
      throw new ForbiddenException();
  }

  private async assertMutationAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (
      !membership ||
      membership.status !== BusinessUserStatus.ACTIVE ||
      (membership.role !== BusinessUserRole.OWNER &&
        membership.role !== BusinessUserRole.MANAGER)
    ) {
      throw new ForbiddenException();
    }
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { status: true },
    });
    if (!business || !ALLOWED_BUSINESS_STATUSES.includes(business.status))
      throw new ForbiddenException();
  }

  private async assertServiceProviderInBusiness(
    serviceProviderId: string,
    businessId: string,
  ): Promise<void> {
    const sp = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: { id: true },
    });
    if (!sp) throw new NotFoundException('Service provider not found');
  }

  private validateHoursPayload(
    hours: Array<{
      dayOfWeek: number;
      isClosed: boolean;
      startTime?: string | null;
      endTime?: string | null;
    }>,
  ): void {
    const seen = new Set<number>();
    for (const h of hours) {
      if (seen.has(h.dayOfWeek)) {
        throw new BadRequestException(
          `Duplicate dayOfWeek value: ${h.dayOfWeek}`,
        );
      }
      seen.add(h.dayOfWeek);
      if (!h.isClosed) {
        this.validateTimeRange(h.startTime ?? null, h.endTime ?? null);
      }
    }
  }

  private validateTimeRange(
    startTime: string | null,
    endTime: string | null,
  ): void {
    if (!startTime || !endTime) {
      throw new BadRequestException(
        'startTime and endTime are required when the day is not closed',
      );
    }
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }
}
