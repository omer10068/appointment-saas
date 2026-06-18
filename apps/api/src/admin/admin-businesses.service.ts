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
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { BusinessUsersService } from '../business-users/business-users.service';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { CreateServiceProviderDto } from '../dashboard/dto/create-service-provider.dto';
import type { CreateServiceDto } from '../dashboard/dto/create-service.dto';
import type {
  ServiceDto,
  ServiceProviderDto,
} from '../dashboard/dashboard-data.service';
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
}
