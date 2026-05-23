import { Injectable } from '@nestjs/common';
import {
  AvailableSlotsEngineService,
  AvailableSlotsResponseDto,
} from '../slots-engine/available-slots-engine.service';
import type { AvailableSlotsQueryDto } from '../dashboard/dto/available-slots-query.dto';
import { PublicBusinessesService } from './public-businesses.service';

@Injectable()
export class PublicSlotsService {
  constructor(
    private readonly businesses: PublicBusinessesService,
    private readonly engine: AvailableSlotsEngineService,
  ) {}

  async getAvailableSlots(
    slug: string,
    query: AvailableSlotsQueryDto,
  ): Promise<AvailableSlotsResponseDto> {
    const business = await this.businesses.findActiveBusinessBySlug(slug);
    return this.engine.computeSlots(business.id, business.timezone, query);
  }
}
