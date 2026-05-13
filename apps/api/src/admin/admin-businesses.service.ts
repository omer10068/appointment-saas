import { Injectable } from '@nestjs/common';
import { Business } from '../generated/prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';

@Injectable()
export class AdminBusinessesService {
  constructor(private readonly businessesService: BusinessesService) {}

  create(dto: CreateBusinessDto): Promise<Business> {
    return this.businessesService.create(dto);
  }

  findAll(): Promise<Business[]> {
    return this.businessesService.findAll();
  }
}
