import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AppointmentStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type BookingSlotParams = {
  businessId: string;
  serviceProviderId: string;
  startsAt: Date;
  endsAt: Date;
};

type ProposedHourItem = {
  dayOfWeek: number;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type AvailabilityExceptionConflictParams = {
  businessId: string;
  serviceProviderId: string | null;
  exceptionDate: Date;
  proposedIsClosed: boolean;
  proposedStartTime: string | null;
  proposedEndTime: string | null;
};

type AvailabilityExceptionDeleteParams = {
  businessId: string;
  serviceProviderId: string | null;
  exceptionDate: Date;
};

export type BusinessHoursConflict = {
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
  serviceProviderId: string;
  businessCustomerId: string;
  reason: string;
};

export type WindowResult =
  | { open: false }
  | { open: true; startMin: number; endMin: number };

export function toLocalDate(utcDate: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}

export function toDayOfWeek(utcDate: Date, timezone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(utcDate);
  const map: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return map[dayName] ?? 0;
}

export function toMinutesSinceMidnight(
  utcDate: Date,
  timezone: string,
): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(
    parts.find((p) => p.type === 'minute')?.value ?? '0',
    10,
  );
  return (hour % 24) * 60 + minute;
}

export function parseTimeString(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function doesSlotFitWindow(
  slotStartMin: number,
  slotEndMin: number,
  winStartMin: number,
  winEndMin: number,
): boolean {
  return slotStartMin >= winStartMin && slotEndMin <= winEndMin;
}

export function dayOfWeekFromLocalDate(localDate: string): number {
  return new Date(localDate + 'T12:00:00Z').getUTCDay();
}

export function localMinutesToUtc(
  localDate: string,
  localMinutes: number,
  timezone: string,
): Date {
  const [year, month, day] = localDate.split('-').map(Number);
  // Noon UTC is always on the same calendar date in any timezone — avoids DST-at-midnight issues
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const localMinAtNoon = toMinutesSinceMidnight(noonUtc, timezone);
  const localMidnightUtc = new Date(
    noonUtc.getTime() - localMinAtNoon * 60_000,
  );
  return new Date(localMidnightUtc.getTime() + localMinutes * 60_000);
}

@Injectable()
export class BookingValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateBookingSlot(params: BookingSlotParams): Promise<void> {
    const { businessId, serviceProviderId, startsAt, endsAt } = params;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) return;

    const { timezone } = business;
    const localDate = toLocalDate(startsAt, timezone);
    const dayOfWeek = toDayOfWeek(startsAt, timezone);
    const slotStartMin = toMinutesSinceMidnight(startsAt, timezone);
    const slotEndMin = toMinutesSinceMidnight(endsAt, timezone);

    const bizWindow = await this.resolveWindow(
      businessId,
      null,
      localDate,
      dayOfWeek,
    );
    if (!bizWindow.open) {
      throw new BadRequestException(
        'Business is not open at the requested time',
      );
    }
    if (
      !doesSlotFitWindow(
        slotStartMin,
        slotEndMin,
        bizWindow.startMin,
        bizWindow.endMin,
      )
    ) {
      throw new BadRequestException(
        'Appointment falls outside business working hours',
      );
    }

    const spWindow = await this.resolveWindow(
      businessId,
      serviceProviderId,
      localDate,
      dayOfWeek,
    );
    if (!spWindow.open) {
      throw new BadRequestException(
        'Service provider is not available at the requested time',
      );
    }
    if (
      !doesSlotFitWindow(
        slotStartMin,
        slotEndMin,
        spWindow.startMin,
        spWindow.endMin,
      )
    ) {
      throw new BadRequestException(
        'Appointment falls outside service provider working hours',
      );
    }
  }

  async checkBusinessHoursConflict(
    businessId: string,
    proposedHours: ProposedHourItem[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) return;

    const { timezone } = business;
    const now = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        startsAt: { gt: now },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        serviceProviderId: true,
        businessCustomerId: true,
      },
    });

    if (appointments.length === 0) return;

    const windowMap = new Map<number, WindowResult>();
    for (const h of proposedHours) {
      if (h.isClosed || !h.startTime || !h.endTime) {
        windowMap.set(h.dayOfWeek, { open: false });
      } else {
        windowMap.set(h.dayOfWeek, {
          open: true,
          startMin: parseTimeString(h.startTime),
          endMin: parseTimeString(h.endTime),
        });
      }
    }

    const conflicts: BusinessHoursConflict[] = [];

    for (const apt of appointments) {
      const dayOfWeek = toDayOfWeek(apt.startsAt, timezone);
      const window = windowMap.get(dayOfWeek);

      let reason: string;
      if (!window || !window.open) {
        reason = 'Business would be closed on this day';
      } else {
        const slotStartMin = toMinutesSinceMidnight(apt.startsAt, timezone);
        const slotEndMin = toMinutesSinceMidnight(apt.endsAt, timezone);
        if (
          doesSlotFitWindow(
            slotStartMin,
            slotEndMin,
            window.startMin,
            window.endMin,
          )
        ) {
          continue;
        }
        reason = 'Appointment falls outside the proposed working hours';
      }

      conflicts.push({
        appointmentId: apt.id,
        startsAt: apt.startsAt,
        endsAt: apt.endsAt,
        serviceProviderId: apt.serviceProviderId,
        businessCustomerId: apt.businessCustomerId,
        reason,
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Working hours change would invalidate existing appointments',
        conflicts,
      });
    }
  }

  async checkServiceProviderHoursConflict(
    businessId: string,
    serviceProviderId: string,
    proposedHours: ProposedHourItem[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) return;

    const { timezone } = business;
    const now = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        serviceProviderId,
        startsAt: { gt: now },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        serviceProviderId: true,
        businessCustomerId: true,
      },
    });

    if (appointments.length === 0) return;

    const windowMap = new Map<number, WindowResult>();
    for (const h of proposedHours) {
      if (h.isClosed || !h.startTime || !h.endTime) {
        windowMap.set(h.dayOfWeek, { open: false });
      } else {
        windowMap.set(h.dayOfWeek, {
          open: true,
          startMin: parseTimeString(h.startTime),
          endMin: parseTimeString(h.endTime),
        });
      }
    }

    const conflicts: BusinessHoursConflict[] = [];

    for (const apt of appointments) {
      const dayOfWeek = toDayOfWeek(apt.startsAt, timezone);
      const window = windowMap.get(dayOfWeek);

      let reason: string;
      if (!window || !window.open) {
        reason = 'Service provider would be unavailable on this day';
      } else {
        const slotStartMin = toMinutesSinceMidnight(apt.startsAt, timezone);
        const slotEndMin = toMinutesSinceMidnight(apt.endsAt, timezone);
        if (
          doesSlotFitWindow(
            slotStartMin,
            slotEndMin,
            window.startMin,
            window.endMin,
          )
        ) {
          continue;
        }
        reason =
          'Appointment falls outside the proposed service provider working hours';
      }

      conflicts.push({
        appointmentId: apt.id,
        startsAt: apt.startsAt,
        endsAt: apt.endsAt,
        serviceProviderId: apt.serviceProviderId,
        businessCustomerId: apt.businessCustomerId,
        reason,
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Working hours change would invalidate existing appointments',
        conflicts,
      });
    }
  }

  async checkAvailabilityExceptionConflict(
    params: AvailabilityExceptionConflictParams,
  ): Promise<void> {
    const {
      businessId,
      serviceProviderId,
      exceptionDate,
      proposedIsClosed,
      proposedStartTime,
      proposedEndTime,
    } = params;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) return;

    const { timezone } = business;
    const exceptionLocalDate = toLocalDate(exceptionDate, timezone);
    const now = new Date();

    const allAppointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        ...(serviceProviderId !== null ? { serviceProviderId } : {}),
        startsAt: { gt: now },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        serviceProviderId: true,
        businessCustomerId: true,
      },
    });

    const appointments = allAppointments.filter(
      (apt) => toLocalDate(apt.startsAt, timezone) === exceptionLocalDate,
    );

    if (appointments.length === 0) return;

    const proposedWindow: WindowResult =
      proposedIsClosed || !proposedStartTime || !proposedEndTime
        ? { open: false }
        : {
            open: true,
            startMin: parseTimeString(proposedStartTime),
            endMin: parseTimeString(proposedEndTime),
          };

    const conflicts: BusinessHoursConflict[] = [];

    for (const apt of appointments) {
      let reason: string;
      if (!proposedWindow.open) {
        reason =
          serviceProviderId !== null
            ? 'Service provider would be unavailable on this date'
            : 'Business would be closed on this date';
      } else {
        const slotStartMin = toMinutesSinceMidnight(apt.startsAt, timezone);
        const slotEndMin = toMinutesSinceMidnight(apt.endsAt, timezone);
        if (
          doesSlotFitWindow(
            slotStartMin,
            slotEndMin,
            proposedWindow.startMin,
            proposedWindow.endMin,
          )
        ) {
          continue;
        }
        reason = 'Appointment falls outside the proposed exception hours';
      }

      conflicts.push({
        appointmentId: apt.id,
        startsAt: apt.startsAt,
        endsAt: apt.endsAt,
        serviceProviderId: apt.serviceProviderId,
        businessCustomerId: apt.businessCustomerId,
        reason,
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message:
          'Availability exception change would invalidate existing appointments',
        conflicts,
      });
    }
  }

  async checkAvailabilityExceptionDeleteConflict(
    params: AvailabilityExceptionDeleteParams,
  ): Promise<void> {
    const { businessId, serviceProviderId, exceptionDate } = params;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) return;

    const { timezone } = business;
    const exceptionLocalDate = toLocalDate(exceptionDate, timezone);
    const dayOfWeek = toDayOfWeek(exceptionDate, timezone);
    const now = new Date();

    const allAppointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        ...(serviceProviderId !== null ? { serviceProviderId } : {}),
        startsAt: { gt: now },
        status: {
          notIn: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        serviceProviderId: true,
        businessCustomerId: true,
      },
    });

    const appointments = allAppointments.filter(
      (apt) => toLocalDate(apt.startsAt, timezone) === exceptionLocalDate,
    );

    if (appointments.length === 0) return;

    let fallbackWindow: WindowResult;

    if (serviceProviderId !== null) {
      const wh = await this.prisma.serviceProviderWorkingHour.findUnique({
        where: {
          serviceProviderId_dayOfWeek: { serviceProviderId, dayOfWeek },
        },
        select: { isClosed: true, startTime: true, endTime: true },
      });
      if (!wh || wh.isClosed || !wh.startTime || !wh.endTime) {
        fallbackWindow = { open: false };
      } else {
        fallbackWindow = {
          open: true,
          startMin: parseTimeString(wh.startTime),
          endMin: parseTimeString(wh.endTime),
        };
      }
    } else {
      const wh = await this.prisma.businessWorkingHour.findUnique({
        where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
        select: { isClosed: true, startTime: true, endTime: true },
      });
      if (!wh || wh.isClosed || !wh.startTime || !wh.endTime) {
        fallbackWindow = { open: false };
      } else {
        fallbackWindow = {
          open: true,
          startMin: parseTimeString(wh.startTime),
          endMin: parseTimeString(wh.endTime),
        };
      }
    }

    const conflicts: BusinessHoursConflict[] = [];

    for (const apt of appointments) {
      let reason: string;
      if (!fallbackWindow.open) {
        reason =
          serviceProviderId !== null
            ? 'Service provider would be unavailable on this date without the exception'
            : 'Business would be closed on this date without the exception';
      } else {
        const slotStartMin = toMinutesSinceMidnight(apt.startsAt, timezone);
        const slotEndMin = toMinutesSinceMidnight(apt.endsAt, timezone);
        if (
          doesSlotFitWindow(
            slotStartMin,
            slotEndMin,
            fallbackWindow.startMin,
            fallbackWindow.endMin,
          )
        ) {
          continue;
        }
        reason =
          'Appointment falls outside the regular working hours that would apply after exception removal';
      }

      conflicts.push({
        appointmentId: apt.id,
        startsAt: apt.startsAt,
        endsAt: apt.endsAt,
        serviceProviderId: apt.serviceProviderId,
        businessCustomerId: apt.businessCustomerId,
        reason,
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message:
          'Deleting this availability exception would invalidate existing appointments',
        conflicts,
      });
    }
  }

  async resolveWindow(
    businessId: string,
    serviceProviderId: string | null,
    localDate: string,
    dayOfWeek: number,
  ): Promise<WindowResult> {
    const exception = await this.prisma.availabilityException.findFirst({
      where: {
        businessId,
        serviceProviderId: serviceProviderId ?? null,
        date: new Date(localDate),
      },
      select: { isClosed: true, startTime: true, endTime: true },
    });

    if (exception) {
      if (exception.isClosed) return { open: false };
      if (exception.startTime && exception.endTime) {
        return {
          open: true,
          startMin: parseTimeString(exception.startTime),
          endMin: parseTimeString(exception.endTime),
        };
      }
    }

    if (serviceProviderId !== null) {
      const wh = await this.prisma.serviceProviderWorkingHour.findUnique({
        where: {
          serviceProviderId_dayOfWeek: { serviceProviderId, dayOfWeek },
        },
        select: { isClosed: true, startTime: true, endTime: true },
      });
      if (!wh || wh.isClosed) return { open: false };
      if (wh.startTime && wh.endTime) {
        return {
          open: true,
          startMin: parseTimeString(wh.startTime),
          endMin: parseTimeString(wh.endTime),
        };
      }
      return { open: false };
    } else {
      const wh = await this.prisma.businessWorkingHour.findUnique({
        where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
        select: { isClosed: true, startTime: true, endTime: true },
      });
      if (!wh || wh.isClosed) return { open: false };
      if (wh.startTime && wh.endTime) {
        return {
          open: true,
          startMin: parseTimeString(wh.startTime),
          endMin: parseTimeString(wh.endTime),
        };
      }
      return { open: false };
    }
  }
}
