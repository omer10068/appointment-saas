import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { UpsertWorkingHoursDto } from './dto/upsert-working-hours.dto';
import { CreateAvailabilityExceptionDto } from './dto/create-availability-exception.dto';
import { UpdateAvailabilityExceptionDto } from './dto/update-availability-exception.dto';
import { AvailabilityService } from './availability.service';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // ─── Business working hours ───────────────────────────────────────────────────

  @Get(':businessId/working-hours')
  getBusinessWorkingHours(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getBusinessWorkingHours(
      req.user.id,
      businessId,
    );
  }

  @Post(':businessId/working-hours/preview')
  previewBusinessWorkingHours(
    @Param('businessId') businessId: string,
    @Body() dto: UpsertWorkingHoursDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.previewBusinessHoursUpdate(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Put(':businessId/working-hours')
  setBusinessWorkingHours(
    @Param('businessId') businessId: string,
    @Body() dto: UpsertWorkingHoursDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.setBusinessWorkingHours(
      req.user.id,
      businessId,
      dto,
    );
  }

  // ─── Service provider working hours ──────────────────────────────────────────

  @Get(':businessId/service-providers/:serviceProviderId/working-hours')
  getServiceProviderWorkingHours(
    @Param('businessId') businessId: string,
    @Param('serviceProviderId') serviceProviderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getServiceProviderWorkingHours(
      req.user.id,
      businessId,
      serviceProviderId,
    );
  }

  @Put(':businessId/service-providers/:serviceProviderId/working-hours')
  setServiceProviderWorkingHours(
    @Param('businessId') businessId: string,
    @Param('serviceProviderId') serviceProviderId: string,
    @Body() dto: UpsertWorkingHoursDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.setServiceProviderWorkingHours(
      req.user.id,
      businessId,
      serviceProviderId,
      dto,
    );
  }

  // ─── Availability exceptions ──────────────────────────────────────────────────

  @Get(':businessId/availability-exceptions')
  getAvailabilityExceptions(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getAvailabilityExceptions(
      req.user.id,
      businessId,
    );
  }

  @Post(':businessId/availability-exceptions')
  createAvailabilityException(
    @Param('businessId') businessId: string,
    @Body() dto: CreateAvailabilityExceptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.createAvailabilityException(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/availability-exceptions/:exceptionId')
  updateAvailabilityException(
    @Param('businessId') businessId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: UpdateAvailabilityExceptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.updateAvailabilityException(
      req.user.id,
      businessId,
      exceptionId,
      dto,
    );
  }

  @Delete(':businessId/availability-exceptions/:exceptionId')
  @HttpCode(204)
  deleteAvailabilityException(
    @Param('businessId') businessId: string,
    @Param('exceptionId') exceptionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.deleteAvailabilityException(
      req.user.id,
      businessId,
      exceptionId,
    );
  }
}
