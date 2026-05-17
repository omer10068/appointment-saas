import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import type { CreateDashboardCustomerDto } from './dto/create-dashboard-customer.dto';
import type { UpdateDashboardCustomerDto } from './dto/update-dashboard-customer.dto';
import type { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import type { UpdateStaffMemberDto } from './dto/update-staff-member.dto';

export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export interface CustomerDto {
  businessCustomerId: string;
  customerProfileId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
  notes: string | null;
}

export interface StaffMemberDto {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SummaryDto {
  servicesCount: number;
  activeServicesCount: number;
  customersCount: number;
  activeCustomersCount: number;
}

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  isActive: true,
  bufferBeforeMin: true,
  bufferAfterMin: true,
} as const;

const STAFF_SELECT = {
  id: true,
  displayName: true,
  isActive: true,
  businessUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DashboardDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Read ────────────────────────────────────────────────────────────────────

  async getServices(userId: string, businessId: string): Promise<ServiceDto[]> {
    await this.assertAccess(userId, businessId);
    return this.prisma.service.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      select: SERVICE_SELECT,
    });
  }

  async getCustomers(
    userId: string,
    businessId: string,
  ): Promise<CustomerDto[]> {
    await this.assertAccess(userId, businessId);
    const records = await this.prisma.businessCustomer.findMany({
      where: { businessId },
      include: { customerProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapToCustomerDto);
  }

  async getStaff(
    userId: string,
    businessId: string,
  ): Promise<StaffMemberDto[]> {
    await this.assertAccess(userId, businessId);
    return this.prisma.staffMember.findMany({
      where: { businessId },
      orderBy: { displayName: 'asc' },
      select: STAFF_SELECT,
    });
  }

  async getSummary(userId: string, businessId: string): Promise<SummaryDto> {
    await this.assertAccess(userId, businessId);
    const [
      servicesCount,
      activeServicesCount,
      customersCount,
      activeCustomersCount,
    ] = await Promise.all([
      this.prisma.service.count({ where: { businessId } }),
      this.prisma.service.count({ where: { businessId, isActive: true } }),
      this.prisma.businessCustomer.count({ where: { businessId } }),
      this.prisma.businessCustomer.count({
        where: { businessId, status: 'ACTIVE' },
      }),
    ]);
    return {
      servicesCount,
      activeServicesCount,
      customersCount,
      activeCustomersCount,
    };
  }

  // ─── Service mutations ────────────────────────────────────────────────────────

  async createService(
    userId: string,
    businessId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceDto> {
    await this.assertMutationAccess(userId, businessId);
    return this.prisma.service.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description ?? null,
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents ?? null,
        bufferBeforeMin: dto.bufferBeforeMin ?? 0,
        bufferAfterMin: dto.bufferAfterMin ?? 0,
        isActive: dto.isActive ?? true,
      },
      select: SERVICE_SELECT,
    });
  }

  async updateService(
    userId: string,
    businessId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceDto> {
    await this.assertMutationAccess(userId, businessId);
    await this.assertServiceInBusiness(serviceId, businessId);
    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
        ...(dto.bufferBeforeMin !== undefined && {
          bufferBeforeMin: dto.bufferBeforeMin,
        }),
        ...(dto.bufferAfterMin !== undefined && {
          bufferAfterMin: dto.bufferAfterMin,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: SERVICE_SELECT,
    });
  }

  async setServiceStatus(
    userId: string,
    businessId: string,
    serviceId: string,
    isActive: boolean,
  ): Promise<ServiceDto> {
    await this.assertMutationAccess(userId, businessId);
    await this.assertServiceInBusiness(serviceId, businessId);
    return this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive },
      select: SERVICE_SELECT,
    });
  }

  // ─── Customer mutations ───────────────────────────────────────────────────────

  async createCustomer(
    userId: string,
    businessId: string,
    dto: CreateDashboardCustomerDto,
  ): Promise<CustomerDto> {
    await this.assertMutationAccess(userId, businessId);
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.customerProfile.create({
        data: {
          fullName: dto.fullName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
        },
      });
      const bc = await tx.businessCustomer.create({
        data: {
          businessId,
          customerProfileId: profile.id,
          status: dto.status ?? 'ACTIVE',
          notes: dto.notes ?? null,
        },
      });
      return {
        businessCustomerId: bc.id,
        customerProfileId: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        status: bc.status,
        notes: bc.notes,
      };
    });
  }

  async updateCustomer(
    userId: string,
    businessId: string,
    businessCustomerId: string,
    dto: UpdateDashboardCustomerDto,
  ): Promise<CustomerDto> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.businessCustomer.findFirst({
      where: { id: businessCustomerId, businessId },
      include: { customerProfile: true },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      const [updatedProfile, updatedBc] = await Promise.all([
        tx.customerProfile.update({
          where: { id: existing.customerProfileId },
          data: {
            ...(dto.fullName !== undefined && { fullName: dto.fullName }),
            ...(dto.email !== undefined && { email: dto.email }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
          },
        }),
        tx.businessCustomer.update({
          where: { id: businessCustomerId },
          data: {
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.status !== undefined && { status: dto.status }),
          },
        }),
      ]);
      return {
        businessCustomerId: updatedBc.id,
        customerProfileId: updatedProfile.id,
        fullName: updatedProfile.fullName,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        status: updatedBc.status,
        notes: updatedBc.notes,
      };
    });
  }

  async setCustomerStatus(
    userId: string,
    businessId: string,
    businessCustomerId: string,
    status: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED',
  ): Promise<CustomerDto> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.businessCustomer.findFirst({
      where: { id: businessCustomerId, businessId },
      include: { customerProfile: true },
    });
    if (!existing) throw new NotFoundException('Customer not found');
    const updated = await this.prisma.businessCustomer.update({
      where: { id: businessCustomerId },
      data: { status },
    });
    return {
      businessCustomerId: updated.id,
      customerProfileId: existing.customerProfileId,
      fullName: existing.customerProfile.fullName,
      email: existing.customerProfile.email,
      phone: existing.customerProfile.phone,
      status: updated.status,
      notes: updated.notes,
    };
  }

  // ─── Staff mutations ──────────────────────────────────────────────────────────

  async createStaffMember(
    userId: string,
    businessId: string,
    dto: CreateStaffMemberDto,
  ): Promise<StaffMemberDto> {
    await this.assertMutationAccess(userId, businessId);
    if (dto.businessUserId) {
      await this.assertBusinessUserInBusiness(dto.businessUserId, businessId);
    }
    return this.prisma.staffMember.create({
      data: {
        businessId,
        displayName: dto.displayName,
        businessUserId: dto.businessUserId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: STAFF_SELECT,
    });
  }

  async updateStaffMember(
    userId: string,
    businessId: string,
    staffMemberId: string,
    dto: UpdateStaffMemberDto,
  ): Promise<StaffMemberDto> {
    await this.assertMutationAccess(userId, businessId);
    await this.assertStaffInBusiness(staffMemberId, businessId);
    if (dto.businessUserId !== undefined && dto.businessUserId !== null) {
      await this.assertBusinessUserInBusiness(dto.businessUserId, businessId);
    }
    return this.prisma.staffMember.update({
      where: { id: staffMemberId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.businessUserId !== undefined && {
          businessUserId: dto.businessUserId,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: STAFF_SELECT,
    });
  }

  async setStaffMemberStatus(
    userId: string,
    businessId: string,
    staffMemberId: string,
    isActive: boolean,
  ): Promise<StaffMemberDto> {
    await this.assertMutationAccess(userId, businessId);
    await this.assertStaffInBusiness(staffMemberId, businessId);
    return this.prisma.staffMember.update({
      where: { id: staffMemberId },
      data: { isActive },
      select: STAFF_SELECT,
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

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

  private async assertServiceInBusiness(
    serviceId: string,
    businessId: string,
  ): Promise<void> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found');
  }

  private async assertStaffInBusiness(
    staffMemberId: string,
    businessId: string,
  ): Promise<void> {
    const staff = await this.prisma.staffMember.findFirst({
      where: { id: staffMemberId, businessId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
  }

  private async assertBusinessUserInBusiness(
    businessUserId: string,
    businessId: string,
  ): Promise<void> {
    const bu = await this.prisma.businessUser.findFirst({
      where: { id: businessUserId, businessId },
      select: { id: true },
    });
    if (!bu)
      throw new BadRequestException(
        'BusinessUser does not belong to this business',
      );
  }
}

// ─── Shared mapper ────────────────────────────────────────────────────────────

function mapToCustomerDto(bc: {
  id: string;
  customerProfileId: string;
  status: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
  notes: string | null;
  customerProfile: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
}): CustomerDto {
  return {
    businessCustomerId: bc.id,
    customerProfileId: bc.customerProfileId,
    fullName: bc.customerProfile.fullName,
    email: bc.customerProfile.email,
    phone: bc.customerProfile.phone,
    status: bc.status,
    notes: bc.notes,
  };
}
