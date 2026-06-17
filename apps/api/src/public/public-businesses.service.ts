import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, BusinessUserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicBusinessProfileDto } from './dto/public-business-profile.dto';
import type { PublicServiceDto } from './dto/public-service.dto';
import type { PublicServiceProviderDto } from './dto/public-service-provider.dto';

const ALLOWED_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.ACTIVE,
  BusinessStatus.TRIAL,
];

@Injectable()
export class PublicBusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(slug: string): Promise<PublicBusinessProfileDto> {
    const business = await this.findActiveBusinessBySlug(slug);
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      locale: business.locale,
      currency: business.currency,
    };
  }

  async getServices(slug: string): Promise<PublicServiceDto[]> {
    const business = await this.findActiveBusinessBySlug(slug);
    const services = await this.prisma.service.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
      orderBy: { name: 'asc' },
    });
    return services;
  }

  async getServiceProviders(slug: string): Promise<PublicServiceProviderDto[]> {
    const business = await this.findActiveBusinessBySlug(slug);
    const providers = await this.prisma.serviceProvider.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        businessUser: { status: BusinessUserStatus.ACTIVE },
      },
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    });
    return providers;
  }

  async findActiveBusinessBySlug(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    locale: string;
    currency: string;
  }> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        publicBookingEnabled: true,
        timezone: true,
        locale: true,
        currency: true,
      },
    });
    if (
      !business ||
      !ALLOWED_BUSINESS_STATUSES.includes(business.status) ||
      !business.publicBookingEnabled
    ) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }
}
