import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BusinessStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingValidationService } from './booking-validation.service';
import type { UpsertWorkingHoursDto } from './dto/upsert-working-hours.dto';
import type { CreateAvailabilityExceptionDto } from './dto/create-availability-exception.dto';
import type { UpdateAvailabilityExceptionDto } from './dto/update-availability-exception.dto';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

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

// ─── Business hours narrowing preview ─────────────────────────────────────────

export interface ProviderHoursChangeItem {
  dayOfWeek: number;
  before: {
    isClosed: boolean;
    startTime: string | null;
    endTime: string | null;
  };
  after: {
    isClosed: boolean;
    startTime: string | null;
    endTime: string | null;
  };
  /** CLOSED: business day closed so provider must close too. CLAMPED: times trimmed. */
  reason: 'CLOSED' | 'CLAMPED';
}

export interface AffectedProviderPreview {
  id: string;
  displayName: string;
  changes: ProviderHoursChangeItem[];
}

export interface BusinessHoursUpdatePreviewDto {
  affectedProviders: AffectedProviderPreview[];
  /** Count of SCHEDULED future appointments whose start/end falls outside the new hours. */
  futureAppointmentsOutsideNewHoursCount: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type BizHourEntry = {
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
};
type NewBizMap = Map<number, BizHourEntry>;

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

// ─── Service ──────────────────────────────────────────────────────────────────

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

  async previewBusinessHoursUpdate(
    userId: string,
    businessId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<BusinessHoursUpdatePreviewDto> {
    await this.assertMutationAccess(userId, businessId);
    this.validateHoursPayload(dto.hours);

    const newBizMap = this.buildNewBizMap(dto.hours);

    // Fetch current provider hours and SP display names
    const [sps, allSpHours] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where: { businessId },
        select: { id: true, displayName: true },
      }),
      this.prisma.serviceProviderWorkingHour.findMany({
        where: { businessId },
        select: {
          serviceProviderId: true,
          dayOfWeek: true,
          isClosed: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const spDisplayNames = new Map(sps.map((sp) => [sp.id, sp.displayName]));
    const rows = allSpHours.map((h) => ({
      spId: h.serviceProviderId,
      displayName:
        spDisplayNames.get(h.serviceProviderId) ?? h.serviceProviderId,
      dayOfWeek: h.dayOfWeek,
      isClosed: h.isClosed,
      startTime: h.startTime,
      endTime: h.endTime,
    }));

    const clampsMap = this.computeProviderHoursClamps(newBizMap, rows);
    const affectedProviders: AffectedProviderPreview[] = [];
    for (const [spId, { displayName, changes }] of clampsMap) {
      affectedProviders.push({ id: spId, displayName, changes });
    }

    // Count future SCHEDULED appointments that fall outside the new business hours
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const timezone = biz?.timezone ?? 'UTC';

    const futureAppts = await this.prisma.appointment.findMany({
      where: {
        businessId,
        startsAt: { gte: new Date() },
        status: AppointmentStatus.SCHEDULED,
      },
      select: { startsAt: true, endsAt: true },
    });

    const futureAppointmentsOutsideNewHoursCount = futureAppts.filter((a) =>
      this.isOutsideNewHours(a.startsAt, a.endsAt, timezone, newBizMap),
    ).length;

    return { affectedProviders, futureAppointmentsOutsideNewHoursCount };
  }

  async setBusinessWorkingHours(
    userId: string,
    businessId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHourDto[]> {
    await this.assertMutationAccess(userId, businessId);
    this.validateHoursPayload(dto.hours);
    // Appointment conflicts are now informational only (shown via /preview).
    // The PUT always applies and never returns 409 for appointment conflicts.
    // Provider hours that become inconsistent are clamped atomically below.

    const newBizMap = this.buildNewBizMap(dto.hours);

    return this.prisma.$transaction(async (tx) => {
      // Fetch all provider hours inside the tx (consistent snapshot)
      const [sps, allSpHours] = await Promise.all([
        tx.serviceProvider.findMany({
          where: { businessId },
          select: { id: true, displayName: true },
        }),
        tx.serviceProviderWorkingHour.findMany({
          where: { businessId },
          select: {
            serviceProviderId: true,
            dayOfWeek: true,
            isClosed: true,
            startTime: true,
            endTime: true,
          },
        }),
      ]);

      const spDisplayNames = new Map(sps.map((sp) => [sp.id, sp.displayName]));
      const rows = allSpHours.map((h) => ({
        spId: h.serviceProviderId,
        displayName:
          spDisplayNames.get(h.serviceProviderId) ?? h.serviceProviderId,
        dayOfWeek: h.dayOfWeek,
        isClosed: h.isClosed,
        startTime: h.startTime,
        endTime: h.endTime,
      }));

      const clampsMap = this.computeProviderHoursClamps(newBizMap, rows);

      // 1. Replace business working hours
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

      // 2. Atomically clamp affected provider hours
      if (clampsMap.size > 0) {
        // Group existing SP hours by spId for O(1) lookup
        const spHoursMap = new Map<string, typeof allSpHours>();
        for (const h of allSpHours) {
          const list = spHoursMap.get(h.serviceProviderId) ?? [];
          list.push(h);
          spHoursMap.set(h.serviceProviderId, list);
        }

        for (const [spId, { changes }] of clampsMap) {
          const changeMap = new Map(changes.map((c) => [c.dayOfWeek, c]));
          const currentHours = spHoursMap.get(spId) ?? [];

          const newHours = currentHours.map((h) => {
            const change = changeMap.get(h.dayOfWeek);
            if (change) {
              return {
                businessId,
                serviceProviderId: spId,
                dayOfWeek: h.dayOfWeek,
                isClosed: change.after.isClosed,
                startTime: change.after.startTime,
                endTime: change.after.endTime,
              };
            }
            return {
              businessId,
              serviceProviderId: spId,
              dayOfWeek: h.dayOfWeek,
              isClosed: h.isClosed,
              startTime: h.startTime,
              endTime: h.endTime,
            };
          });

          await tx.serviceProviderWorkingHour.deleteMany({
            where: { serviceProviderId: spId },
          });
          if (newHours.length > 0) {
            await tx.serviceProviderWorkingHour.createMany({ data: newHours });
          }
        }
      }

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
    // Conflict check (appointments) runs outside the tx — reads appointments, not hours
    await this.bookingValidation.checkServiceProviderHoursConflict(
      businessId,
      serviceProviderId,
      dto.hours,
    );
    return this.prisma.$transaction(async (tx) => {
      // Re-read business hours inside the tx to prevent TOCTOU race with a
      // concurrent business-hours update. If business hours changed between the
      // outer validateHoursPayload call and this write, this check catches it.
      const bizHours = await tx.businessWorkingHour.findMany({
        where: { businessId },
        select: {
          dayOfWeek: true,
          isClosed: true,
          startTime: true,
          endTime: true,
        },
      });
      const bizMap = new Map(bizHours.map((h) => [h.dayOfWeek, h]));
      for (const h of dto.hours) {
        if (h.isClosed) continue;
        const biz = bizMap.get(h.dayOfWeek);
        if (!biz || biz.isClosed) {
          throw new BadRequestException(
            `Service provider cannot be open on day ${h.dayOfWeek}: the business is closed on that day`,
          );
        }
        const provStart = h.startTime ?? '';
        const provEnd = h.endTime ?? '';
        const bizStart = biz.startTime ?? '';
        const bizEnd = biz.endTime ?? '';
        if (provStart < bizStart || provEnd > bizEnd) {
          throw new BadRequestException(
            `Service provider hours on day ${h.dayOfWeek} (${provStart}–${provEnd}) must be within business hours (${bizStart}–${bizEnd})`,
          );
        }
      }

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
    const timezone = await this.getBusinessTimezone(businessId);
    this.assertNotPastDate(dto.date, timezone);
    if (dto.serviceProviderId) {
      await this.assertServiceProviderInBusiness(
        dto.serviceProviderId,
        businessId,
      );
    }
    if (!dto.isClosed) {
      this.validateTimeRange(dto.startTime ?? null, dto.endTime ?? null);
    }
    await this.bookingValidation.checkAvailabilityExceptionConflict({
      businessId,
      serviceProviderId: dto.serviceProviderId ?? null,
      exceptionDate: new Date(dto.date),
      proposedIsClosed: dto.isClosed,
      proposedStartTime: dto.isClosed ? null : (dto.startTime ?? null),
      proposedEndTime: dto.isClosed ? null : (dto.endTime ?? null),
    });
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
      select: {
        id: true,
        date: true,
        serviceProviderId: true,
        isClosed: true,
        startTime: true,
        endTime: true,
      },
    });
    if (!existing)
      throw new NotFoundException('Availability exception not found');

    const timezone = await this.getBusinessTimezone(businessId);
    this.assertNotPastDate(existing.date.toISOString().slice(0, 10), timezone);

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

    const effectiveServiceProviderId =
      dto.serviceProviderId !== undefined
        ? (dto.serviceProviderId ?? null)
        : (existing.serviceProviderId ?? null);

    await this.bookingValidation.checkAvailabilityExceptionConflict({
      businessId,
      serviceProviderId: effectiveServiceProviderId,
      exceptionDate: existing.date,
      proposedIsClosed: isClosed,
      proposedStartTime: isClosed ? null : (startTime ?? null),
      proposedEndTime: isClosed ? null : (endTime ?? null),
    });

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
      select: { id: true, date: true, serviceProviderId: true },
    });
    if (!existing)
      throw new NotFoundException('Availability exception not found');
    await this.bookingValidation.checkAvailabilityExceptionDeleteConflict({
      businessId,
      serviceProviderId: existing.serviceProviderId ?? null,
      exceptionDate: existing.date,
    });
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

  private async getBusinessTimezone(businessId: string): Promise<string> {
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    return biz?.timezone ?? 'UTC';
  }

  private assertNotPastDate(dateStr: string, timezone: string): void {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const todayStr =
      parts.find((p) => p.type === 'year')!.value +
      '-' +
      parts.find((p) => p.type === 'month')!.value +
      '-' +
      parts.find((p) => p.type === 'day')!.value;
    if (dateStr < todayStr) {
      throw new BadRequestException(
        'Cannot create an availability exception for a past date',
      );
    }
  }

  // ─── Business hours narrowing helpers ────────────────────────────────────────

  private buildNewBizMap(
    hours: Array<{
      dayOfWeek: number;
      isClosed: boolean;
      startTime?: string | null;
      endTime?: string | null;
    }>,
  ): NewBizMap {
    return new Map(
      hours.map((h) => [
        h.dayOfWeek,
        {
          isClosed: h.isClosed,
          startTime: h.isClosed ? null : (h.startTime ?? null),
          endTime: h.isClosed ? null : (h.endTime ?? null),
        },
      ]),
    );
  }

  /**
   * For each open provider working-hour row, computes what needs to change so
   * that all provider hours remain within the new business hours. Returns a map
   * of spId → { displayName, changes[] }. Only providers with at least one
   * change are included.
   */
  private computeProviderHoursClamps(
    newBizMap: NewBizMap,
    rows: Array<{
      spId: string;
      displayName: string;
      dayOfWeek: number;
      isClosed: boolean;
      startTime: string | null;
      endTime: string | null;
    }>,
  ): Map<string, { displayName: string; changes: ProviderHoursChangeItem[] }> {
    const result = new Map<
      string,
      { displayName: string; changes: ProviderHoursChangeItem[] }
    >();

    for (const row of rows) {
      if (row.isClosed) continue; // already closed — nothing to clamp

      const biz = newBizMap.get(row.dayOfWeek);
      let change: ProviderHoursChangeItem | null = null;

      if (!biz || biz.isClosed) {
        // Business will be closed on this day → provider must close too
        change = {
          dayOfWeek: row.dayOfWeek,
          before: {
            isClosed: false,
            startTime: row.startTime,
            endTime: row.endTime,
          },
          after: { isClosed: true, startTime: null, endTime: null },
          reason: 'CLOSED',
        };
      } else {
        // Business remains open — clamp times if needed
        const clampedStart =
          (row.startTime ?? '') < (biz.startTime ?? '')
            ? biz.startTime!
            : row.startTime!;
        const clampedEnd =
          (row.endTime ?? '') > (biz.endTime ?? '')
            ? biz.endTime!
            : row.endTime!;

        if (clampedStart !== row.startTime || clampedEnd !== row.endTime) {
          change = {
            dayOfWeek: row.dayOfWeek,
            before: {
              isClosed: false,
              startTime: row.startTime,
              endTime: row.endTime,
            },
            after: {
              isClosed: false,
              startTime: clampedStart,
              endTime: clampedEnd,
            },
            reason: 'CLAMPED',
          };
        }
      }

      if (change) {
        const entry = result.get(row.spId) ?? {
          displayName: row.displayName,
          changes: [],
        };
        entry.changes.push(change);
        result.set(row.spId, entry);
      }
    }

    return result;
  }

  /** Returns true if the appointment falls outside the new business hours window. */
  private isOutsideNewHours(
    startsAt: Date,
    endsAt: Date,
    timezone: string,
    newBizMap: NewBizMap,
  ): boolean {
    const dow = this.getLocalDayOfWeek(startsAt, timezone);
    const biz = newBizMap.get(dow);
    if (!biz || biz.isClosed) return true;
    const localStart = this.getLocalHHmm(startsAt, timezone);
    const localEnd = this.getLocalHHmm(endsAt, timezone);
    return localStart < (biz.startTime ?? '') || localEnd > (biz.endTime ?? '');
  }

  private getLocalDayOfWeek(date: Date, timezone: string): number {
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(date);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayStr);
  }

  private getLocalHHmm(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const h = parts.find((p) => p.type === 'hour')!.value;
    const m = parts.find((p) => p.type === 'minute')!.value;
    return `${h}:${m}`;
  }
}
