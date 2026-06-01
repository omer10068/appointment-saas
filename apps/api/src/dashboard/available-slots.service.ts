import { ForbiddenException, Injectable } from '@nestjs/common';
import { BusinessStatus, BusinessUserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AvailableSlotsEngineService,
  AvailableSlotsResponseDto,
  AvailableSlotItem,
} from '../slots-engine/available-slots-engine.service';
import type { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';

export type { AvailableSlotItem, AvailableSlotsResponseDto };

const ALLOWED_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.ACTIVE,
  BusinessStatus.TRIAL,
];

@Injectable()
export class AvailableSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AvailableSlotsEngineService,
  ) {}

  async getAvailableSlots(
    userId: string,
    businessId: string,
    query: AvailableSlotsQueryDto,
  ): Promise<AvailableSlotsResponseDto> {
    const { timezone } = await this.assertAccess(userId, businessId);
    return this.engine.computeSlots(businessId, timezone, query);
  }

  private async assertAccess(
    userId: string,
    businessId: string,
  ): Promise<{ timezone: string }> {
    const membership = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { status: true },
    });
    if (!membership || membership.status !== BusinessUserStatus.ACTIVE)
      throw new ForbiddenException();

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { status: true, timezone: true },
    });
    if (!business || !ALLOWED_BUSINESS_STATUSES.includes(business.status))
      throw new ForbiddenException();

    return { timezone: business.timezone };
  }
}
