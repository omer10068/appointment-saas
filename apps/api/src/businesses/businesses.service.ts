import { ConflictException, Injectable } from '@nestjs/common';
import { Business, BusinessUser } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBusinessDto): Promise<Business> {
    try {
      return await this.prisma.business.create({ data: dto });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('A business with this slug already exists');
      }
      throw err;
    }
  }

  async findAll(): Promise<Business[]> {
    return this.prisma.business.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findMine(
    userId: string,
  ): Promise<(BusinessUser & { business: Business })[]> {
    return this.prisma.businessUser.findMany({
      where: { userId },
      include: { business: true },
    });
  }
}
