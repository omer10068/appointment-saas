import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { CreateDashboardAppointmentDto } from './dto/create-dashboard-appointment.dto';
import { UpdateDashboardAppointmentDto } from './dto/update-dashboard-appointment.dto';
import { UpdateDashboardAppointmentStatusDto } from './dto/update-dashboard-appointment-status.dto';
import { AppointmentsService } from './appointments.service';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':businessId/appointments')
  getAppointments(
    @Param('businessId') businessId: string,
    @Query() query: AppointmentQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.getAppointments(
      req.user.id,
      businessId,
      query,
    );
  }

  @Post(':businessId/appointments')
  createAppointment(
    @Param('businessId') businessId: string,
    @Body() dto: CreateDashboardAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.createAppointment(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/appointments/:appointmentId')
  updateAppointment(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateDashboardAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.updateAppointment(
      req.user.id,
      businessId,
      appointmentId,
      dto,
    );
  }

  @Patch(':businessId/appointments/:appointmentId/status')
  setAppointmentStatus(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateDashboardAppointmentStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.setAppointmentStatus(
      req.user.id,
      businessId,
      appointmentId,
      dto,
    );
  }
}
