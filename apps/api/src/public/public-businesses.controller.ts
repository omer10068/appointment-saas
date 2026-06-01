import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailableSlotsQueryDto } from '../dashboard/dto/available-slots-query.dto';
import { PublicBusinessesService } from './public-businesses.service';
import { PublicSlotsService } from './public-slots.service';

@Controller('public/businesses')
export class PublicBusinessesController {
  constructor(
    private readonly businesses: PublicBusinessesService,
    private readonly slots: PublicSlotsService,
  ) {}

  @Get(':slug')
  getProfile(@Param('slug') slug: string) {
    return this.businesses.getProfile(slug);
  }

  @Get(':slug/services')
  getServices(@Param('slug') slug: string) {
    return this.businesses.getServices(slug);
  }

  @Get(':slug/service-providers')
  getServiceProviders(@Param('slug') slug: string) {
    return this.businesses.getServiceProviders(slug);
  }

  @Get(':slug/available-slots')
  getAvailableSlots(
    @Param('slug') slug: string,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.slots.getAvailableSlots(slug, query);
  }
}
