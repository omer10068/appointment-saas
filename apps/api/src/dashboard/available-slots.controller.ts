import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AvailableSlotsService } from './available-slots.service';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';

@UseGuards(ClerkAuthGuard)
@Controller('dashboard/businesses')
export class AvailableSlotsController {
  constructor(private readonly slotsService: AvailableSlotsService) {}

  @Get(':businessId/available-slots')
  getAvailableSlots(
    @Param('businessId') businessId: string,
    @Query() query: AvailableSlotsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.slotsService.getAvailableSlots(req.user.id, businessId, query);
  }
}
