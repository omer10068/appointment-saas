import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Business,
  BusinessStatus,
  BusinessUser,
  BusinessUserStatus,
  PlatformRole,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { BusinessUsersService } from '../business-users/business-users.service';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { CreateServiceProviderDto } from '../dashboard/dto/create-service-provider.dto';
import type { CreateServiceDto } from '../dashboard/dto/create-service.dto';
import type { CreateBusinessUserDto } from '../dashboard/dto/create-business-user.dto';
import type { UpsertWorkingHoursDto } from '../dashboard/dto/upsert-working-hours.dto';
import type { UpdateBusinessSettingsDto } from '../dashboard/dto/update-business-settings.dto';
import type { UpdateServiceDto } from '../dashboard/dto/update-service.dto';
import type { UpdateServiceProviderDto } from '../dashboard/dto/update-service-provider.dto';
import type {
  BusinessUserCreatedDto,
  ServiceDto,
  ServiceProviderDto,
} from '../dashboard/dashboard-data.service';
import type { WorkingHourDto } from '../dashboard/availability.service';
import { normalizePhone } from '../dashboard/phone.util';
import { computeBusinessReadiness } from '../dashboard/readiness.utils';
import type { BusinessReadinessDto } from '../dashboard/readiness.utils';

@Injectable()
export class AdminBusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly businessUsersService: BusinessUsersService,
  ) {}

  create(dto: CreateBusinessDto): Promise<Business> {
    return this.businessesService.create(dto);
  }

  findAll(): Promise<Business[]> {
    return this.businessesService.findAll();
  }

  createOwner(
    businessId: string,
    dto: CreateBusinessOwnerDto,
  ): Promise<BusinessUser> {
    return this.businessUsersService.createOwnerForBusiness(businessId, dto);
  }

  async setBusinessStatus(
    businessId: string,
    targetStatus: typeof BusinessStatus.TRIAL | typeof BusinessStatus.ACTIVE,
  ): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (targetStatus === BusinessStatus.TRIAL) {
      if (business.status !== BusinessStatus.DRAFT) {
        throw new ConflictException(
          'Business must be in DRAFT status to start trial',
        );
      }
      return this.prisma.business.update({
        where: { id: businessId },
        data: { status: BusinessStatus.TRIAL },
      });
    }

    // targetStatus === ACTIVE
    if (business.status === BusinessStatus.DRAFT) {
      throw new ConflictException(
        'DRAFT businesses cannot be activated directly; move to TRIAL first',
      );
    }
    if (business.status !== BusinessStatus.TRIAL) {
      throw new ConflictException(
        `Cannot transition from ${business.status} to ACTIVE`,
      );
    }

    const readiness = await computeBusinessReadiness(this.prisma, businessId);
    if (!readiness.isReady) {
      throw new BadRequestException(
        `Business is not ready for activation: ${readiness.blockingReasons.join('; ')}`,
      );
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.ACTIVE },
    });
  }

  async createServiceProvider(
    businessId: string,
    dto: CreateServiceProviderDto,
  ): Promise<ServiceProviderDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

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

  async createService(
    businessId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

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

  async addBusinessUser(
    businessId: string,
    dto: CreateBusinessUserDto,
  ): Promise<BusinessUserCreatedDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

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

  async setPublicBookingEnabled(
    businessId: string,
    enabled: boolean,
  ): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    if (!enabled) {
      return this.prisma.business.update({
        where: { id: businessId },
        data: { publicBookingEnabled: false },
      });
    }

    if (
      business.status !== BusinessStatus.TRIAL &&
      business.status !== BusinessStatus.ACTIVE
    ) {
      throw new ConflictException(
        'Public booking can only be enabled for TRIAL or ACTIVE businesses',
      );
    }

    const readiness = await computeBusinessReadiness(this.prisma, businessId);
    if (!readiness.isReady) {
      throw new BadRequestException(
        `Business is not ready for public booking: ${readiness.blockingReasons.join('; ')}`,
      );
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: { publicBookingEnabled: true },
    });
  }

  async setBusinessWorkingHours(
    businessId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHourDto[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const seen = new Set<number>();
    for (const h of dto.hours) {
      if (seen.has(h.dayOfWeek)) {
        throw new BadRequestException(
          `Duplicate dayOfWeek value: ${h.dayOfWeek}`,
        );
      }
      seen.add(h.dayOfWeek);
      if (!h.isClosed) {
        const startTime = h.startTime ?? null;
        const endTime = h.endTime ?? null;
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
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isClosed: true,
        },
      });
    });
  }

  async setServiceProviderWorkingHours(
    businessId: string,
    serviceProviderId: string,
    dto: UpsertWorkingHoursDto,
  ): Promise<WorkingHourDto[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const sp = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: { id: true },
    });
    if (!sp) throw new NotFoundException('Service provider not found');

    const seen = new Set<number>();
    for (const h of dto.hours) {
      if (seen.has(h.dayOfWeek)) {
        throw new BadRequestException(
          `Duplicate dayOfWeek value: ${h.dayOfWeek}`,
        );
      }
      seen.add(h.dayOfWeek);
      if (!h.isClosed) {
        const startTime = h.startTime ?? null;
        const endTime = h.endTime ?? null;
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
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isClosed: true,
        },
      });
    });
  }

  async getBusinessReadiness(
    businessId: string,
  ): Promise<BusinessReadinessDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return computeBusinessReadiness(this.prisma, businessId);
  }

  async updateBusinessMetadata(
    businessId: string,
    dto: UpdateBusinessSettingsDto,
  ): Promise<Business> {
    const hasField =
      dto.name !== undefined ||
      dto.timezone !== undefined ||
      dto.locale !== undefined ||
      dto.currency !== undefined;
    if (!hasField) {
      throw new BadRequestException(
        'At least one field must be provided to update',
      );
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });
  }

  async updateService(
    businessId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found');

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

  async updateServiceProvider(
    businessId: string,
    serviceProviderId: string,
    dto: UpdateServiceProviderDto,
  ): Promise<ServiceProviderDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const existing = await this.prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, businessId },
      select: {
        id: true,
        displayName: true,
        isActive: true,
        businessUserId: true,
        services: {
          select: { serviceId: true, service: { select: { isActive: true } } },
        },
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
    } else if (effectiveIsActive) {
      if (existing.services.length === 0) {
        throw new BadRequestException(
          'Cannot activate ServiceProvider with no services',
        );
      }
      if (existing.services.some((s) => !s.service.isActive)) {
        throw new BadRequestException(
          'Active ServiceProvider cannot be linked to inactive services',
        );
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
      });

      const finalServiceIds =
        dto.serviceIds !== undefined
          ? dto.serviceIds
          : existing.services.map((s) => s.serviceId);

      return {
        id: updated.id,
        displayName: updated.displayName,
        isActive: updated.isActive,
        businessUserId: updated.businessUserId,
        serviceIds: finalServiceIds,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    });
  }

  async getOnboardingSummary(
    businessId: string,
  ): Promise<AdminOnboardingSummaryDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        timezone: true,
        publicBookingEnabled: true,
        businessUsers: {
          select: {
            id: true,
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                phoneNormalized: true,
                email: true,
              },
            },
          },
          orderBy: { role: 'asc' },
        },
        services: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        },
        serviceProviders: {
          select: {
            id: true,
            displayName: true,
            isActive: true,
            businessUserId: true,
            services: {
              select: { serviceId: true },
            },
            serviceProviderWorkingHours: {
              select: { id: true },
              take: 1,
            },
          },
          orderBy: { displayName: 'asc' },
        },
        businessWorkingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isClosed: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    const readiness = await computeBusinessReadiness(this.prisma, businessId);

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        status: business.status,
        timezone: business.timezone,
        publicBookingEnabled: business.publicBookingEnabled,
      },
      users: business.businessUsers.map((bu) => ({
        id: bu.id,
        role: bu.role,
        status: bu.status,
        user: {
          id: bu.user.id,
          phone: bu.user.phoneNormalized,
          email: bu.user.email,
        },
      })),
      services: business.services,
      serviceProviders: business.serviceProviders.map((sp) => ({
        id: sp.id,
        displayName: sp.displayName,
        isActive: sp.isActive,
        businessUserId: sp.businessUserId,
        serviceIds: sp.services.map((s) => s.serviceId),
        hasWorkingHours: sp.serviceProviderWorkingHours.length > 0,
      })),
      businessWorkingHours: business.businessWorkingHours,
      readiness,
    };
  }
}

export interface AdminOnboardingSummaryDto {
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    timezone: string;
    publicBookingEnabled: boolean;
  };
  users: Array<{
    id: string;
    role: string;
    status: string;
    user: {
      id: string;
      phone: string;
      email: string | null;
    };
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number | null;
    isActive: boolean;
  }>;
  serviceProviders: Array<{
    id: string;
    displayName: string;
    isActive: boolean;
    businessUserId: string;
    serviceIds: string[];
    hasWorkingHours: boolean;
  }>;
  businessWorkingHours: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string | null;
    endTime: string | null;
    isClosed: boolean;
  }>;
  readiness: BusinessReadinessDto;
}
