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
import { SetBusinessTrialDto } from './dto/set-business-trial.dto';

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
    @Body() dto: SetBusinessTrialDto,
  ) {
    return this.adminBusinessesService.moveDraftToTrial(businessId);
  }
}
