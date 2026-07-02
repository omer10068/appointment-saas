import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

type InvariantQueryClient = Pick<
  Prisma.TransactionClient,
  'service' | 'serviceProviderService'
>;

export const SERVICE_NEEDS_ACTIVE_PROVIDER_MESSAGE =
  'Active service must have at least one active service provider assigned';

export const LAST_ACTIVE_PROVIDER_MESSAGE =
  'Cannot remove the last active service provider from an active service';

/**
 * A service may only be ACTIVE while at least one ACTIVE ServiceProvider is
 * linked to it. Call before persisting any transition of a service to
 * isActive: true.
 */
export async function assertServiceHasActiveProviderAssignment(
  prisma: InvariantQueryClient,
  serviceId: string,
): Promise<void> {
  const activeLink = await prisma.serviceProviderService.findFirst({
    where: {
      serviceId,
      serviceProvider: { isActive: true },
    },
    select: { serviceProviderId: true },
  });
  if (!activeLink) {
    throw new BadRequestException(SERVICE_NEEDS_ACTIVE_PROVIDER_MESSAGE);
  }
}

/**
 * Mirror of the service-side invariant: deactivating a provider, or removing
 * specific service links from a provider that remains active, must not leave
 * any ACTIVE service with zero ACTIVE provider assignments.
 *
 * Pass `'all-linked'` when the provider itself is becoming inactive (every
 * service currently linked to it is at risk). Pass the specific removed
 * service ids when the provider stays active but a subset of links is being
 * dropped.
 */
export async function assertNoActiveServiceLosesLastActiveProvider(
  prisma: InvariantQueryClient,
  businessId: string,
  providerId: string,
  removedServiceIds: string[] | 'all-linked',
): Promise<void> {
  if (removedServiceIds !== 'all-linked' && removedServiceIds.length === 0) {
    return;
  }

  const where: Prisma.ServiceWhereInput =
    removedServiceIds === 'all-linked'
      ? {
          businessId,
          isActive: true,
          serviceProviders: { some: { serviceProviderId: providerId } },
          AND: [
            {
              serviceProviders: {
                none: {
                  serviceProviderId: { not: providerId },
                  serviceProvider: { isActive: true },
                },
              },
            },
          ],
        }
      : {
          businessId,
          isActive: true,
          id: { in: removedServiceIds },
          serviceProviders: {
            none: {
              serviceProviderId: { not: providerId },
              serviceProvider: { isActive: true },
            },
          },
        };

  const orphaned = await prisma.service.findFirst({
    where,
    select: { id: true },
  });
  if (orphaned) {
    throw new BadRequestException(LAST_ACTIVE_PROVIDER_MESSAGE);
  }
}
