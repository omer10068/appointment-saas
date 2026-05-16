import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';

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
    return records.map((bc) => ({
      businessCustomerId: bc.id,
      customerProfileId: bc.customerProfileId,
      fullName: bc.customerProfile.fullName,
      email: bc.customerProfile.email,
      phone: bc.customerProfile.phone,
      status: bc.status,
      notes: bc.notes,
    }));
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

  // ─── Mutations ───────────────────────────────────────────────────────────────

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
}
