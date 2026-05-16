import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class DashboardDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getServices(userId: string, businessId: string): Promise<ServiceDto[]> {
    await this.assertAccess(userId, businessId);
    return this.prisma.service.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        isActive: true,
        bufferBeforeMin: true,
        bufferAfterMin: true,
      },
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

  private async assertAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!membership) throw new ForbiddenException();
  }
}
