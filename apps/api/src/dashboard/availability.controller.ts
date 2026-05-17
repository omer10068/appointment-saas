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

  // ─── Staff working hours ──────────────────────────────────────────────────────

  @Get(':businessId/staff/:staffMemberId/working-hours')
  getStaffWorkingHours(
    @Param('businessId') businessId: string,
    @Param('staffMemberId') staffMemberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.getStaffWorkingHours(
      req.user.id,
      businessId,
      staffMemberId,
    );
  }

  @Put(':businessId/staff/:staffMemberId/working-hours')
  setStaffWorkingHours(
    @Param('businessId') businessId: string,
    @Param('staffMemberId') staffMemberId: string,
    @Body() dto: UpsertWorkingHoursDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.setStaffWorkingHours(
      req.user.id,
      businessId,
      staffMemberId,
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
