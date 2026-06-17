import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  BusinessUserRole,
  BusinessUserStatus,
  CustomerStatus,
  PlatformRole,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from './phone.util';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import type { CreateDashboardCustomerDto } from './dto/create-dashboard-customer.dto';
import type { UpdateDashboardCustomerDto } from './dto/update-dashboard-customer.dto';
import type { CreateBusinessUserDto } from './dto/create-business-user.dto';
import type { UpdateBusinessUserRoleDto } from './dto/update-business-user-role.dto';
import type { UpdateBusinessUserStatusDto } from './dto/update-business-user-status.dto';
import type { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import type { UpdateServiceProviderDto } from './dto/update-service-provider.dto';
import type { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { computeBusinessReadiness } from './readiness.utils';
import type { BusinessReadinessDto } from './readiness.utils';

export type {
  BusinessReadinessChecks,
  BusinessReadinessDto,
} from './readiness.utils';

export interface BusinessSettingsDto {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  phone: string;
  status: CustomerStatus;
  notes: string | null;
}

export interface ServiceProviderDto {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string;
  serviceIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessUserDto {
  id: string;
  userId: string;
  role: string;
  status: string;
  hasServiceProviderProfile: boolean;
}

export interface BusinessUserCreatedDto {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  status: string;
  phoneNormalized: string;
  email: string | null;
  serviceProviderId: string | null;
}

export interface SummaryDto {
  servicesCount: number;
  activeServicesCount: number;
  customersCount: number;
  activeCustomersCount: number;
}

const BUSINESS_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  timezone: true,
  locale: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

const SERVICE_PROVIDER_SELECT = {
  id: true,
  displayName: true,
  isActive: true,
  businessUserId: true,
  createdAt: true,
  updatedAt: true,
  services: { select: { serviceId: true } },
} as const;

const ALLOWED_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.ACTIVE,
  BusinessStatus.TRIAL,
];

@Injectable()
export class DashboardDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Business settings ───────────────────────────────────────────────────────

  async getBusinessSettings(
    userId: string,
    businessId: string,
  ): Promise<BusinessSettingsDto> {
    await this.assertAccess(userId, businessId);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: BUSINESS_SELECT,
    });
    return business!;
  }

  async updateBusinessSettings(
    userId: string,
    businessId: string,
    dto: UpdateBusinessSettingsDto,
  ): Promise<BusinessSettingsDto> {
    if (
      dto.name === undefined &&
      dto.timezone === undefined &&
      dto.locale === undefined &&
      dto.currency === undefined
    ) {
      throw new BadRequestException(
        'At least one field must be provided to update',
      );
    }
    await this.assertMutationAccess(userId, businessId);
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
      select: BUSINESS_SELECT,
    });
  }

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

  async getServiceProviders(
    userId: string,
    businessId: string,
  ): Promise<ServiceProviderDto[]> {
    await this.assertAccess(userId, businessId);
    const records = await this.prisma.serviceProvider.findMany({
      where: { businessId },
      orderBy: { displayName: 'asc' },
      select: SERVICE_PROVIDER_SELECT,
    });
    return records.map(toServiceProviderDto);
  }

  async getBusinessUsers(
    userId: string,
    businessId: string,
  ): Promise<BusinessUserDto[]> {
    await this.assertOwnerAccess(userId, businessId);
    const records = await this.prisma.businessUser.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        serviceProvider: { select: { id: true } },
      },
    });
    return records.map((bu) => ({
      id: bu.id,
      userId: bu.userId,
      role: bu.role,
      status: bu.status,
      hasServiceProviderProfile: bu.serviceProvider !== null,
    }));
  }

  async createBusinessUser(
    userId: string,
    businessId: string,
    dto: CreateBusinessUserDto,
  ): Promise<BusinessUserCreatedDto> {
    await this.assertOwnerAccess(userId, businessId);

    const phoneNormalized = normalizePhone(dto.phone);

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { phoneNormalized } });
      if (!user) {
        user = await tx.user.create({
          data: {
            phoneNormalized,
            email: dto.email ?? null,
            status: UserStatus.ACTIVE,
            platformRole: PlatformRole.USER,
          },
        });
      }

      const existingBu = await tx.businessUser.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (existingBu) {
        throw new ConflictException(
          'This user is already a member of this business',
        );
      }

      const bu = await tx.businessUser.create({
        data: {
          businessId,
          userId: user.id,
          role: dto.role,
          status: BusinessUserStatus.ACTIVE,
        },
      });

      const serviceProvider = await tx.serviceProvider.findUnique({
        where: { businessUserId: bu.id },
        select: { id: true },
      });

      return {
        id: bu.id,
        userId: user.id,
        businessId,
        role: bu.role,
        status: bu.status,
        phoneNormalized: user.phoneNormalized,
        email: user.email,
        serviceProviderId: serviceProvider?.id ?? null,
      };
    });
  }

  async updateBusinessUserRole(
    userId: string,
    businessId: string,
    businessUserId: string,
    dto: UpdateBusinessUserRoleDto,
  ): Promise<BusinessUserDto> {
    await this.assertOwnerAccess(userId, businessId);

    const target = await this.prisma.businessUser.findFirst({
      where: { id: businessUserId, businessId },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        serviceProvider: { select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('Business user not found');

    if (target.role === BusinessUserRole.OWNER) {
      throw new BadRequestException('Cannot change the role of an owner');
    }

    if (target.userId === userId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const updated = await this.prisma.businessUser.update({
      where: { id: businessUserId },
      data: { role: dto.role },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        serviceProvider: { select: { id: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      status: updated.status,
      hasServiceProviderProfile: updated.serviceProvider !== null,
    };
  }

  async updateBusinessUserStatus(
    userId: string,
    businessId: string,
    businessUserId: string,
    dto: UpdateBusinessUserStatusDto,
  ): Promise<BusinessUserDto> {
    await this.assertOwnerAccess(userId, businessId);

    const target = await this.prisma.businessUser.findFirst({
      where: { id: businessUserId, businessId },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        serviceProvider: { select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('Business user not found');

    if (target.userId === userId) {
      throw new BadRequestException('Cannot change your own status');
    }

    if (
      dto.status === BusinessUserStatus.BLOCKED &&
      target.role === BusinessUserRole.OWNER
    ) {
      const activeOwnerCount = await this.prisma.businessUser.count({
        where: {
          businessId,
          role: BusinessUserRole.OWNER,
          status: BusinessUserStatus.ACTIVE,
        },
      });
      if (activeOwnerCount <= 1) {
        throw new BadRequestException('Cannot block the last active owner');
      }
    }

    const updated = await this.prisma.businessUser.update({
      where: { id: businessUserId },
      data: { status: dto.status },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        serviceProvider: { select: { id: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      status: updated.status,
      hasServiceProviderProfile: updated.serviceProvider !== null,
    };
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
        where: { businessId, status: CustomerStatus.ACTIVE },
      }),
    ]);
    return {
      servicesCount,
      activeServicesCount,
      customersCount,
      activeCustomersCount,
    };
  }

  async getBusinessReadiness(
    userId: string,
    businessId: string,
  ): Promise<BusinessReadinessDto> {
    await this.assertAccess(userId, businessId);
    return computeBusinessReadiness(this.prisma, businessId);
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

    const phoneNormalized = normalizePhone(dto.phone);

    return this.prisma.$transaction(async (tx) => {
      // Reuse existing CustomerProfile if one exists with the same phone
      let profile = await tx.customerProfile.findUnique({
        where: { phoneNormalized },
      });

      if (!profile) {
        profile = await tx.customerProfile.create({
          data: {
            fullName: dto.fullName,
            email: dto.email ?? null,
            phoneNormalized,
          },
        });
      }

      // Reuse or create BusinessCustomer for this business
      const existingBc = await tx.businessCustomer.findUnique({
        where: {
          businessId_customerProfileId: {
            businessId,
            customerProfileId: profile.id,
          },
        },
      });

      if (existingBc) {
        throw new ConflictException(
          'A customer with this phone number already exists in this business',
        );
      }

      const bc = await tx.businessCustomer.create({
        data: {
          businessId,
          customerProfileId: profile.id,
          status: dto.status ?? CustomerStatus.ACTIVE,
          notes: dto.notes ?? null,
        },
      });

      return {
        businessCustomerId: bc.id,
        customerProfileId: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phoneNormalized,
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

    let phoneNormalized: string | undefined;
    if (dto.phone !== undefined) {
      phoneNormalized = normalizePhone(dto.phone);
      // Reject if another CustomerProfile already owns this phone
      const conflict = await this.prisma.customerProfile.findFirst({
        where: {
          phoneNormalized,
          id: { not: existing.customerProfileId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          'Another customer with this phone number already exists',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const [updatedProfile, updatedBc] = await Promise.all([
        tx.customerProfile.update({
          where: { id: existing.customerProfileId },
          data: {
            ...(dto.fullName !== undefined && { fullName: dto.fullName }),
            ...(dto.email !== undefined && { email: dto.email }),
            ...(phoneNormalized !== undefined && { phoneNormalized }),
          },
        }),
        tx.businessCustomer.update({
          where: { id: businessCustomerId },
          data: {
            ...(dto.notes !== undefined && { notes: dto.notes }),
          },
        }),
      ]);
      return {
        businessCustomerId: updatedBc.id,
        customerProfileId: updatedProfile.id,
        fullName: updatedProfile.fullName,
        email: updatedProfile.email,
        phone: updatedProfile.phoneNormalized,
        status: updatedBc.status,
        notes: updatedBc.notes,
      };
    });
  }

  async setCustomerStatus(
    userId: string,
    businessId: string,
    businessCustomerId: string,
    status: CustomerStatus,
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
      phone: existing.customerProfile.phoneNormalized,
      status: updated.status,
      notes: updated.notes,
    };
  }

  // ─── ServiceProvider mutations ────────────────────────────────────────────────

  async createServiceProvider(
    userId: string,
    businessId: string,
    dto: CreateServiceProviderDto,
  ): Promise<ServiceProviderDto> {
    await this.assertMutationAccess(userId, businessId);

    const businessUser = await this.prisma.businessUser.findFirst({
      where: { id: dto.businessUserId, businessId },
      select: { id: true, status: true },
    });
    if (!businessUser) {
      throw new BadRequestException(
        'BusinessUser does not belong to this business',
      );
    }

    const isActive = dto.isActive ?? true;
    if (isActive && businessUser.status !== BusinessUserStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create an active ServiceProvider for a non-ACTIVE BusinessUser',
      );
    }

    const duplicate = await this.prisma.serviceProvider.findUnique({
      where: { businessUserId: dto.businessUserId },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'This BusinessUser already has a ServiceProvider profile',
      );
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds }, businessId },
      select: { id: true, isActive: true },
    });
    if (services.length !== dto.serviceIds.length) {
      throw new BadRequestException(
        'One or more services do not belong to this business',
      );
    }
    if (isActive && services.some((s) => !s.isActive)) {
      throw new BadRequestException(
        'Active ServiceProvider cannot be linked to inactive services',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const sp = await tx.serviceProvider.create({
        data: {
          businessId,
          displayName: dto.displayName,
          businessUserId: dto.businessUserId,
          isActive,
        },
      });
      await tx.serviceProviderService.createMany({
        data: dto.serviceIds.map((serviceId) => ({
          serviceProviderId: sp.id,
          serviceId,
        })),
      });
      return {
        id: sp.id,
        displayName: sp.displayName,
        isActive: sp.isActive,
        businessUserId: sp.businessUserId,
        serviceIds: dto.serviceIds,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      };
    });
  }

  async updateServiceProvider(
    userId: string,
    businessId: string,
    serviceProviderId: string,
    dto: UpdateServiceProviderDto,
  ): Promise<ServiceProviderDto> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: {
        id: true,
        isActive: true,
        businessUserId: true,
        services: { select: { serviceId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Service provider not found');

    const effectiveIsActive = dto.isActive ?? existing.isActive;

    if (dto.serviceIds !== undefined) {
      if (effectiveIsActive && dto.serviceIds.length === 0) {
        throw new BadRequestException(
          'Active ServiceProvider must have at least one service',
        );
      }
      if (dto.serviceIds.length > 0) {
        const services = await this.prisma.service.findMany({
          where: { id: { in: dto.serviceIds }, businessId },
          select: { id: true, isActive: true },
        });
        if (services.length !== dto.serviceIds.length) {
          throw new BadRequestException(
            'One or more services do not belong to this business',
          );
        }
        if (effectiveIsActive && services.some((s) => !s.isActive)) {
          throw new BadRequestException(
            'Active ServiceProvider cannot be linked to inactive services',
          );
        }
      }
    } else {
      // No serviceIds in update — check that current links are still valid when activating
      if (effectiveIsActive && existing.services.length === 0) {
        throw new BadRequestException(
          'Cannot activate ServiceProvider with no services',
        );
      }
      if (effectiveIsActive && existing.services.length > 0) {
        const inactiveServiceCount = await this.prisma.service.count({
          where: {
            id: { in: existing.services.map((s) => s.serviceId) },
            isActive: false,
          },
        });
        if (inactiveServiceCount > 0) {
          throw new BadRequestException(
            'Active ServiceProvider cannot be linked to inactive services',
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.serviceIds !== undefined) {
        await tx.serviceProviderService.deleteMany({
          where: { serviceProviderId },
        });
        if (dto.serviceIds.length > 0) {
          await tx.serviceProviderService.createMany({
            data: dto.serviceIds.map((serviceId) => ({
              serviceProviderId,
              serviceId,
            })),
          });
        }
      }

      const updated = await tx.serviceProvider.update({
        where: { id: serviceProviderId },
        data: {
          ...(dto.displayName !== undefined && {
            displayName: dto.displayName,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        select: SERVICE_PROVIDER_SELECT,
      });

      return toServiceProviderDto(updated);
    });
  }

  async setServiceProviderStatus(
    userId: string,
    businessId: string,
    serviceProviderId: string,
    isActive: boolean,
  ): Promise<ServiceProviderDto> {
    await this.assertMutationAccess(userId, businessId);
    const existing = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: {
        id: true,
        businessUserId: true,
        services: { select: { serviceId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Service provider not found');

    if (isActive) {
      if (existing.services.length === 0) {
        throw new BadRequestException(
          'Cannot activate ServiceProvider with no services',
        );
      }
      const inactiveServiceCount = await this.prisma.service.count({
        where: {
          id: { in: existing.services.map((s) => s.serviceId) },
          isActive: false,
        },
      });
      if (inactiveServiceCount > 0) {
        throw new BadRequestException(
          'Active ServiceProvider cannot be linked to inactive services',
        );
      }
      const businessUser = await this.prisma.businessUser.findUnique({
        where: { id: existing.businessUserId },
        select: { status: true },
      });
      if (!businessUser || businessUser.status !== BusinessUserStatus.ACTIVE) {
        throw new BadRequestException(
          'Cannot activate ServiceProvider whose linked BusinessUser is not ACTIVE',
        );
      }
    }

    const updated = await this.prisma.serviceProvider.update({
      where: { id: serviceProviderId },
      data: { isActive },
      select: SERVICE_PROVIDER_SELECT,
    });
    return toServiceProviderDto(updated);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

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

  private async assertOwnerAccess(
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
    if (
      !business ||
      !ALLOWED_BUSINESS_STATUSES.includes(business.status) ||
      membership.role !== BusinessUserRole.OWNER
    ) {
      throw new ForbiddenException();
    }
  }

  private async assertMutationAccess(
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
    if (
      !business ||
      !ALLOWED_BUSINESS_STATUSES.includes(business.status) ||
      (membership.role !== BusinessUserRole.OWNER &&
        membership.role !== BusinessUserRole.MANAGER)
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

// ─── Shared mappers ───────────────────────────────────────────────────────────

function toServiceProviderDto(row: {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string;
  createdAt: Date;
  updatedAt: Date;
  services: { serviceId: string }[];
}): ServiceProviderDto {
  return {
    id: row.id,
    displayName: row.displayName,
    isActive: row.isActive,
    businessUserId: row.businessUserId,
    serviceIds: row.services.map((s) => s.serviceId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapToCustomerDto(bc: {
  id: string;
  customerProfileId: string;
  status: CustomerStatus;
  notes: string | null;
  customerProfile: {
    fullName: string;
    email: string | null;
    phoneNormalized: string;
  };
}): CustomerDto {
  return {
    businessCustomerId: bc.id,
    customerProfileId: bc.customerProfileId,
    fullName: bc.customerProfile.fullName,
    email: bc.customerProfile.email,
    phone: bc.customerProfile.phoneNormalized,
    status: bc.status,
    notes: bc.notes,
  };
}
