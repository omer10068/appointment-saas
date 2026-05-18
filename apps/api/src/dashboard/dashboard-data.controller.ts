import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { CreateDashboardCustomerDto } from './dto/create-dashboard-customer.dto';
import { UpdateDashboardCustomerDto } from './dto/update-dashboard-customer.dto';
import { UpdateDashboardCustomerStatusDto } from './dto/update-dashboard-customer-status.dto';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { UpdateStaffMemberStatusDto } from './dto/update-staff-member-status.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { DashboardDataService } from './dashboard-data.service';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class DashboardDataController {
  constructor(private readonly dashboardDataService: DashboardDataService) {}

  // ─── Services (read) ─────────────────────────────────────────────────────────

  @Get(':businessId/services')
  getServices(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getServices(req.user.id, businessId);
  }

  // ─── Services (mutations) ─────────────────────────────────────────────────────

  @Post(':businessId/services')
  createService(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.createService(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/services/:serviceId')
  updateService(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.updateService(
      req.user.id,
      businessId,
      serviceId,
      dto,
    );
  }

  @Patch(':businessId/services/:serviceId/status')
  setServiceStatus(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.setServiceStatus(
      req.user.id,
      businessId,
      serviceId,
      dto.isActive,
    );
  }

  // ─── Customers (read) ─────────────────────────────────────────────────────────

  @Get(':businessId/customers')
  getCustomers(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getCustomers(req.user.id, businessId);
  }

  // ─── Customers (mutations) ────────────────────────────────────────────────────

  @Post(':businessId/customers')
  createCustomer(
    @Param('businessId') businessId: string,
    @Body() dto: CreateDashboardCustomerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.createCustomer(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/customers/:businessCustomerId')
  updateCustomer(
    @Param('businessId') businessId: string,
    @Param('businessCustomerId') businessCustomerId: string,
    @Body() dto: UpdateDashboardCustomerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.updateCustomer(
      req.user.id,
      businessId,
      businessCustomerId,
      dto,
    );
  }

  @Patch(':businessId/customers/:businessCustomerId/status')
  setCustomerStatus(
    @Param('businessId') businessId: string,
    @Param('businessCustomerId') businessCustomerId: string,
    @Body() dto: UpdateDashboardCustomerStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.setCustomerStatus(
      req.user.id,
      businessId,
      businessCustomerId,
      dto.status,
    );
  }

  // ─── Staff (read) ────────────────────────────────────────────────────────────

  @Get(':businessId/staff')
  getStaff(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getStaff(req.user.id, businessId);
  }

  // ─── Staff (mutations) ────────────────────────────────────────────────────────

  @Post(':businessId/staff')
  createStaffMember(
    @Param('businessId') businessId: string,
    @Body() dto: CreateStaffMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.createStaffMember(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/staff/:staffMemberId')
  updateStaffMember(
    @Param('businessId') businessId: string,
    @Param('staffMemberId') staffMemberId: string,
    @Body() dto: UpdateStaffMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.updateStaffMember(
      req.user.id,
      businessId,
      staffMemberId,
      dto,
    );
  }

  @Patch(':businessId/staff/:staffMemberId/status')
  setStaffMemberStatus(
    @Param('businessId') businessId: string,
    @Param('staffMemberId') staffMemberId: string,
    @Body() dto: UpdateStaffMemberStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.setStaffMemberStatus(
      req.user.id,
      businessId,
      staffMemberId,
      dto.isActive,
    );
  }

  // ─── Business users (read) ────────────────────────────────────────────────────

  @Get(':businessId/users')
  getBusinessUsers(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getBusinessUsers(req.user.id, businessId);
  }

  // ─── Business users (mutations) ───────────────────────────────────────────────

  @Post(':businessId/users')
  createBusinessUser(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.createBusinessUser(
      req.user.id,
      businessId,
      dto,
    );
  }

  // ─── Business readiness ───────────────────────────────────────────────────────

  @Get(':businessId/readiness')
  getBusinessReadiness(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getBusinessReadiness(
      req.user.id,
      businessId,
    );
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  @Get(':businessId/summary')
  getSummary(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getSummary(req.user.id, businessId);
  }
}
