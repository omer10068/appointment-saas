import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { AdminBusinessesService } from './admin-businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';
import { SetBusinessStatusDto } from './dto/set-business-trial.dto';
import { SetBusinessPublicBookingDto } from './dto/set-business-public-booking.dto';
import { CreateServiceProviderDto } from '../dashboard/dto/create-service-provider.dto';

@UseGuards(ClerkAuthGuard, PlatformAdminGuard)
@Controller('admin/businesses')
export class AdminBusinessesController {
  constructor(
    private readonly adminBusinessesService: AdminBusinessesService,
  ) {}

  @Post()
  create(@Body() dto: CreateBusinessDto) {
    return this.adminBusinessesService.create(dto);
  }

  @Get()
  findAll() {
    return this.adminBusinessesService.findAll();
  }

  @Post(':businessId/owner')
  createOwner(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessOwnerDto,
  ) {
    return this.adminBusinessesService.createOwner(businessId, dto);
  }

  @Patch(':businessId/status')
  setStatus(
    @Param('businessId') businessId: string,
    @Body() dto: SetBusinessStatusDto,
  ) {
    return this.adminBusinessesService.setBusinessStatus(
      businessId,
      dto.status,
    );
  }

  @Patch(':businessId/public-booking')
  setPublicBooking(
    @Param('businessId') businessId: string,
    @Body() dto: SetBusinessPublicBookingDto,
  ) {
    return this.adminBusinessesService.setPublicBookingEnabled(
      businessId,
      dto.publicBookingEnabled,
    );
  }

  @Post(':businessId/service-providers')
  createServiceProvider(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceProviderDto,
  ) {
    return this.adminBusinessesService.createServiceProvider(businessId, dto);
  }

  @Get(':businessId/readiness')
  getBusinessReadiness(@Param('businessId') businessId: string) {
    return this.adminBusinessesService.getBusinessReadiness(businessId);
  }
}
