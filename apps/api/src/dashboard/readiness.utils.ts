import {
  BusinessUserRole,
  BusinessUserStatus,
} from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export interface BusinessReadinessChecks {
  hasActiveOwner: boolean;
  hasActiveService: boolean;
  hasActiveServiceProvider: boolean;
  hasBusinessWorkingHours: boolean;
  allActiveProvidersHaveWorkingHours: boolean;
  allActiveProvidersHaveActiveServiceAssignment: boolean;
  allActiveServicesHaveActiveProviderAssignment: boolean;
}

export interface BusinessReadinessDto {
  // Legacy fields preserved for backward compatibility
  hasActiveServiceProviders: boolean;
  hasActiveService: boolean;
  isReady: boolean;
  // Detailed check results
  checks: BusinessReadinessChecks;
  blockingReasons: string[];
}

export async function computeBusinessReadiness(
  prisma: PrismaService,
  businessId: string,
): Promise<BusinessReadinessDto> {
  const [
    activeOwnerCount,
    activeServiceCount,
    activeProviderCount,
    businessHoursCount,
    providersWithNoHours,
    providersWithNoActiveService,
    servicesWithNoActiveProvider,
  ] = await Promise.all([
    prisma.businessUser.count({
      where: {
        businessId,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    }),
    prisma.service.count({ where: { businessId, isActive: true } }),
    prisma.serviceProvider.count({ where: { businessId, isActive: true } }),
    prisma.businessWorkingHour.count({ where: { businessId } }),
    prisma.serviceProvider.findMany({
      where: {
        businessId,
        isActive: true,
        serviceProviderWorkingHours: { none: {} },
      },
      select: { id: true },
    }),
    prisma.serviceProvider.findMany({
      where: {
        businessId,
        isActive: true,
        services: { none: { service: { isActive: true } } },
      },
      select: { id: true },
    }),
    prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
        serviceProviders: { none: { serviceProvider: { isActive: true } } },
      },
      select: { id: true },
    }),
  ]);

  const checks: BusinessReadinessChecks = {
    hasActiveOwner: activeOwnerCount > 0,
    hasActiveService: activeServiceCount > 0,
    hasActiveServiceProvider: activeProviderCount > 0,
    hasBusinessWorkingHours: businessHoursCount > 0,
    allActiveProvidersHaveWorkingHours: providersWithNoHours.length === 0,
    allActiveProvidersHaveActiveServiceAssignment:
      providersWithNoActiveService.length === 0,
    allActiveServicesHaveActiveProviderAssignment:
      servicesWithNoActiveProvider.length === 0,
  };

  const blockingReasons: string[] = [];
  if (!checks.hasActiveOwner) blockingReasons.push('No active owner');
  if (!checks.hasActiveService) blockingReasons.push('No active service');
  if (!checks.hasActiveServiceProvider)
    blockingReasons.push('No active service provider');
  if (!checks.hasBusinessWorkingHours)
    blockingReasons.push('No business working hours configured');
  if (!checks.allActiveProvidersHaveWorkingHours)
    blockingReasons.push(
      'One or more active service providers have no working hours',
    );
  if (!checks.allActiveProvidersHaveActiveServiceAssignment)
    blockingReasons.push(
      'One or more active service providers have no active service assignment',
    );
  if (!checks.allActiveServicesHaveActiveProviderAssignment)
    blockingReasons.push(
      'One or more active services have no active service provider assignment',
    );

  const isReady = blockingReasons.length === 0;

  return {
    hasActiveServiceProviders: checks.hasActiveServiceProvider,
    hasActiveService: checks.hasActiveService,
    isReady,
    checks,
    blockingReasons,
  };
}
