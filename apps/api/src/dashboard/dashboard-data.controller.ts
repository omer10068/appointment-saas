import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DashboardDataService } from './dashboard-data.service';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class DashboardDataController {
  constructor(private readonly dashboardDataService: DashboardDataService) {}

  @Get(':businessId/services')
  getServices(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getServices(req.user.id, businessId);
  }

  @Get(':businessId/customers')
  getCustomers(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getCustomers(req.user.id, businessId);
  }

  @Get(':businessId/summary')
  getSummary(
    @Param('businessId') businessId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardDataService.getSummary(req.user.id, businessId);
  }
}
