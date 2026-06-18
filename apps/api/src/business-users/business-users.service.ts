import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessUser,
  BusinessUserRole,
  BusinessUserStatus,
  UserStatus,
} from '../generated/prisma/client';
import { CreateBusinessOwnerDto } from '../admin/dto/create-business-owner.dto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../dashboard/phone.util';
import { ClerkProvisioningService } from '../auth/clerk-provisioning.service';

@Injectable()
export class BusinessUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clerkProvisioning: ClerkProvisioningService,
  ) {}

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

    const email = dto.email.trim().toLowerCase();

    // Provision Clerk user BEFORE the transaction — Clerk is an external API and
    // cannot participate in a Prisma transaction. We skip provisioning if the
    // internal User already has a clerkUserId (idempotent on retry: the next call
    // will search Clerk by email and find the previously created account).
    const existingByPhone = await this.prisma.user.findUnique({
      where: { phoneNormalized },
      select: { clerkUserId: true },
    });
    let existingClerkUserId = existingByPhone?.clerkUserId ?? null;

    if (!existingClerkUserId) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { clerkUserId: true },
      });
      existingClerkUserId = existingByEmail?.clerkUserId ?? null;
    }

    const clerkUserId: string =
      existingClerkUserId ??
      (await this.clerkProvisioning.findOrCreateClerkUser({ email }))
        .clerkUserId;

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

      // Find or create the internal User, then link clerkUserId
      let user = await tx.user.findUnique({ where: { phoneNormalized } });

      if (!user && email) {
        user = await tx.user.findUnique({ where: { email } });
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            phoneNormalized,
            email,
            clerkUserId,
            status: UserStatus.ACTIVE,
          },
        });
      } else if (!user.clerkUserId) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { clerkUserId, status: UserStatus.ACTIVE },
        });
      }

      try {
        return await tx.businessUser.create({
          data: {
            businessId,
            userId: user.id,
            role: BusinessUserRole.OWNER,
            status: BusinessUserStatus.ACTIVE,
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
