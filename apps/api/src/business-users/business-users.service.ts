import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessUser, BusinessUserRole } from '../generated/prisma/client';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../dashboard/phone.util';

@Injectable()
export class BusinessUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOwnerForBusiness(
    businessId: string,
    dto: CreateBusinessOwnerDto,
  ): Promise<BusinessUser> {
    let phoneNormalized: string;
    try {
      phoneNormalized = normalizePhone(dto.phone);
    } catch {
      throw new BadRequestException('Invalid phone number');
    }

    const email = dto.email?.trim().toLowerCase() ?? null;

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }

      const existingOwner = await tx.businessUser.findFirst({
        where: { businessId, role: BusinessUserRole.OWNER },
      });
      if (existingOwner) {
        throw new ConflictException('Business already has an owner');
      }

      // Phone-first: look up existing user by normalized phone, then email fallback
      let user = await tx.user.findUnique({ where: { phoneNormalized } });

      if (!user && email) {
        user = await tx.user.findUnique({ where: { email } });
      }

      if (!user) {
        user = await tx.user.create({
          data: { phoneNormalized, email, status: 'INVITED' },
        });
      }

      try {
        return await tx.businessUser.create({
          data: {
            businessId,
            userId: user.id,
            role: BusinessUserRole.OWNER,
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
