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
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';
import { UpdateServiceProviderStatusDto } from './dto/update-service-provider-status.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { DashboardDataService } from './dashboard-data.service';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class DashboardDataController {
  constructor(private readonly dashboardDataService: DashboardDataService) {}

  // ─── Business settings ────────────────────────────────────────────────────────

  @Get(':businessId')
  getBusinessSettings(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getBusinessSettings(req.user.id, businessId);
  }

  @Patch(':businessId')
  updateBusinessSettings(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.updateBusinessSettings(
      req.user.id,
      businessId,
      dto,
    );
  }

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

  // ─── Service providers (read) ─────────────────────────────────────────────────

  @Get(':businessId/service-providers')
  getServiceProviders(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getServiceProviders(
      req.user.id,
      businessId,
    );
  }

  // ─── Service providers (mutations) ────────────────────────────────────────────

  @Post(':businessId/service-providers')
  createServiceProvider(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceProviderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.createServiceProvider(
      req.user.id,
      businessId,
      dto,
    );
  }

  @Patch(':businessId/service-providers/:serviceProviderId')
  updateServiceProvider(
    @Param('businessId') businessId: string,
    @Param('serviceProviderId') serviceProviderId: string,
    @Body() dto: UpdateServiceProviderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.updateServiceProvider(
      req.user.id,
      businessId,
      serviceProviderId,
      dto,
    );
  }

  @Patch(':businessId/service-providers/:serviceProviderId/status')
  setServiceProviderStatus(
    @Param('businessId') businessId: string,
    @Param('serviceProviderId') serviceProviderId: string,
    @Body() dto: UpdateServiceProviderStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.setServiceProviderStatus(
      req.user.id,
      businessId,
      serviceProviderId,
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
