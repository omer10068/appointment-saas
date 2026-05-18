import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AppointmentQueryDto } from './dto/appointment-query.dto';
import type { CreateDashboardAppointmentDto } from './dto/create-dashboard-appointment.dto';
import type { UpdateDashboardAppointmentDto } from './dto/update-dashboard-appointment.dto';
import type { UpdateDashboardAppointmentStatusDto } from './dto/update-dashboard-appointment-status.dto';

export interface AppointmentDto {
  id: string;
  businessId: string;
  businessCustomerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  staffMemberId: string;
  staffMemberName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const APPOINTMENT_SELECT = {
  id: true,
  businessId: true,
  businessCustomerId: true,
  serviceId: true,
  staffMemberId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  businessCustomer: {
    select: {
      customerProfile: { select: { fullName: true } },
    },
  },
  service: { select: { name: true } },
  staffMember: { select: { displayName: true } },
} as const;

type AppointmentRow = {
  id: string;
  businessId: string;
  businessCustomerId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
  businessCustomer: { customerProfile: { fullName: string } };
  service: { name: string };
  staffMember: { displayName: string };
};

function toDto(row: AppointmentRow): AppointmentDto {
  return {
    id: row.id,
    businessId: row.businessId,
    businessCustomerId: row.businessCustomerId,
    customerName: row.businessCustomer.customerProfile.fullName,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    staffMemberId: row.staffMemberId,
    staffMemberName: row.staffMember.displayName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAppointments(
    userId: string,
    businessId: string,
    query: AppointmentQueryDto,
  ): Promise<AppointmentDto[]> {
    await this.assertAccess(userId, businessId);

    const where: Record<string, unknown> = { businessId };
    if (query.from || query.to) {
      where['startsAt'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.status) {
      where['status'] = query.status;
    }

    const rows = await this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      select: APPOINTMENT_SELECT,
    });

    return rows.map((r) => toDto(r));
  }

  async createAppointment(
    userId: string,
    businessId: string,
    dto: CreateDashboardAppointmentDto,
  ): Promise<AppointmentDto> {
    await this.assertMutationAccess(userId, businessId);

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, businessId },
      select: { id: true, durationMinutes: true, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (!service.isActive)
      throw new BadRequestException('Service is not active');

    const customer = await this.prisma.businessCustomer.findFirst({
      where: { id: dto.businessCustomerId, businessId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.assertStaffReadyForBooking(
      dto.staffMemberId,
      businessId,
      dto.serviceId,
    );

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60 * 1000,
    );

    await this.checkStaffConflict(dto.staffMemberId, startsAt, endsAt, null);

    // TODO: validate against working hours / availability exceptions
    const row = await this.prisma.appointment.create({
      data: {
        businessId,
        businessCustomerId: dto.businessCustomerId,
        serviceId: dto.serviceId,
        staffMemberId: dto.staffMemberId,
        startsAt,
        endsAt,
        status: AppointmentStatus.SCHEDULED,
      },
      select: APPOINTMENT_SELECT,
    });

    return toDto(row);
  }

  async updateAppointment(
    userId: string,
    businessId: string,
    appointmentId: string,
    dto: UpdateDashboardAppointmentDto,
  ): Promise<AppointmentDto> {
    await this.assertMutationAccess(userId, businessId);

    const existing = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      select: {
        id: true,
        serviceId: true,
        staffMemberId: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    if (
      existing.status === 'CANCELLED_BY_CUSTOMER' ||
      existing.status === 'CANCELLED_BY_BUSINESS' ||
      existing.status === 'COMPLETED' ||
      existing.status === 'NO_SHOW'
    ) {
      throw new BadRequestException('Cannot update a closed appointment');
    }

    let serviceId = existing.serviceId;
    let durationMinutes: number | null = null;

    if (dto.serviceId && dto.serviceId !== existing.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, businessId },
        select: { id: true, durationMinutes: true, isActive: true },
      });
      if (!service) throw new NotFoundException('Service not found');
      if (!service.isActive)
        throw new BadRequestException('Service is not active');
      serviceId = service.id;
      durationMinutes = service.durationMinutes;
    }

    // staffMemberId can be changed but never nulled
    const staffMemberId =
      dto.staffMemberId !== undefined
        ? dto.staffMemberId
        : existing.staffMemberId;

    if (dto.staffMemberId !== undefined) {
      await this.assertStaffReadyForBooking(
        dto.staffMemberId,
        businessId,
        serviceId,
      );
    } else if (
      dto.serviceId !== undefined &&
      dto.serviceId !== existing.serviceId
    ) {
      // Service changed but staff not — re-validate existing staff provides new service
      await this.assertStaffProvidesService(staffMemberId, serviceId);
    }

    let startsAt = existing.startsAt;
    let endsAt = existing.endsAt;

    const needsRecompute =
      dto.startsAt !== undefined || durationMinutes !== null;
    if (needsRecompute) {
      if (dto.startsAt !== undefined) {
        startsAt = new Date(dto.startsAt);
      }
      if (durationMinutes !== null) {
        endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
      } else if (dto.startsAt !== undefined) {
        const diffMs = existing.endsAt.getTime() - existing.startsAt.getTime();
        endsAt = new Date(startsAt.getTime() + diffMs);
      }
    }

    await this.checkStaffConflict(
      staffMemberId,
      startsAt,
      endsAt,
      appointmentId,
    );

    const row = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(dto.serviceId !== undefined && { serviceId }),
        ...(dto.staffMemberId !== undefined && { staffMemberId }),
        ...(dto.startsAt !== undefined && { startsAt }),
        ...(needsRecompute && { endsAt }),
      },
      select: APPOINTMENT_SELECT,
    });

    return toDto(row);
  }

  async setAppointmentStatus(
    userId: string,
    businessId: string,
    appointmentId: string,
    dto: UpdateDashboardAppointmentStatusDto,
  ): Promise<AppointmentDto> {
    await this.assertMutationAccess(userId, businessId);

    const existing = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    const row = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: dto.status as AppointmentStatus },
      select: APPOINTMENT_SELECT,
    });

    return toDto(row);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async assertAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!membership) throw new ForbiddenException();
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
      (membership.role !== 'OWNER' && membership.role !== 'MANAGER')
    ) {
      throw new ForbiddenException();
    }
  }

  /**
   * Full staff validation for booking:
   * - Staff belongs to business
   * - Staff is active
   * - Staff's linked BusinessUser is ACTIVE
   * - Staff provides the selected service
   */
  private async assertStaffReadyForBooking(
    staffMemberId: string,
    businessId: string,
    serviceId: string,
  ): Promise<void> {
    const staff = await this.prisma.staffMember.findFirst({
      where: { id: staffMemberId, businessId },
      select: { id: true, isActive: true, businessUserId: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    if (!staff.isActive)
      throw new BadRequestException('Staff member is not active');

    const businessUser = await this.prisma.businessUser.findUnique({
      where: { id: staff.businessUserId },
      select: { status: true },
    });
    if (!businessUser || businessUser.status !== 'ACTIVE') {
      throw new BadRequestException(
        "Staff member's linked user account is not active",
      );
    }

    await this.assertStaffProvidesService(staffMemberId, serviceId);
  }

  private async assertStaffProvidesService(
    staffMemberId: string,
    serviceId: string,
  ): Promise<void> {
    const link = await this.prisma.staffMemberService.findFirst({
      where: { staffMemberId, serviceId },
      select: { staffMemberId: true },
    });
    if (!link) {
      throw new BadRequestException(
        'Staff member does not provide the selected service',
      );
    }
  }

  private async checkStaffConflict(
    staffMemberId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId: string | null,
  ): Promise<void> {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        staffMemberId,
        status: {
          notIn: ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_BUSINESS'],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        'Staff member has a conflicting appointment at this time',
      );
    }
  }
}
