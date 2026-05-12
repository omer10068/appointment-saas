import { Body, Controller, Get, Post } from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';

@Controller('admin/businesses')
export class AdminBusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  create(@Body() dto: CreateBusinessDto) {
    return this.businessesService.create(dto);
  }

  @Get()
  findAll() {
    return this.businessesService.findAll();
  }
}
