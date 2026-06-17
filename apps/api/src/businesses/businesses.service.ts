import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Business,
  BusinessStatus,
  BusinessUser,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBusinessDto): Promise<Business> {
    try {
      return await this.prisma.business.create({
        data: { ...dto, status: BusinessStatus.DRAFT },
      });
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

  async moveDraftToTrial(businessId: string): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    if (business.status !== BusinessStatus.DRAFT) {
      throw new ConflictException(
        'Business must be in DRAFT status to start trial',
      );
    }
    return this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.TRIAL },
    });
  }
}
