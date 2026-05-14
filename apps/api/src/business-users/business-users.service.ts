import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessUser } from '../generated/prisma/client';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOwnerForBusiness(
    businessId: string,
    dto: CreateBusinessOwnerDto,
  ): Promise<BusinessUser> {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }

      const existingOwner = await tx.businessUser.findFirst({
        where: { businessId, role: 'OWNER' },
      });
      if (existingOwner) {
        throw new ConflictException('Business already has an owner');
      }

      const existingUser = await tx.user.findUnique({
        where: { email: dto.email },
      });
      const user =
        existingUser ??
        (await tx.user.create({
          data: { email: dto.email, status: 'INVITED' },
        }));

      try {
        return await tx.businessUser.create({
          data: {
            businessId,
            userId: user.id,
            role: 'OWNER',
            status: 'INVITED',
          },
        });
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          throw new ConflictException(
            'User is already a member of this business',
          );
        }
        throw err;
      }
    });
  }
}
