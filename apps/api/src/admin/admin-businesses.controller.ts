import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdminBusinessesService } from './admin-businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';

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
}
