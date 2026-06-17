import { Injectable } from '@nestjs/common';
import { Business, BusinessUser } from '../generated/prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';
import { BusinessUsersService } from '../business-users/business-users.service';
import { CreateBusinessOwnerDto } from './dto/create-business-owner.dto';

@Injectable()
export class AdminBusinessesService {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly businessUsersService: BusinessUsersService,
  ) {}

  create(dto: CreateBusinessDto): Promise<Business> {
    return this.businessesService.create(dto);
  }

  findAll(): Promise<Business[]> {
    return this.businessesService.findAll();
  }

  createOwner(
    businessId: string,
    dto: CreateBusinessOwnerDto,
  ): Promise<BusinessUser> {
    return this.businessUsersService.createOwnerForBusiness(businessId, dto);
  }

  moveDraftToTrial(businessId: string): Promise<Business> {
    return this.businessesService.moveDraftToTrial(businessId);
  }
}
