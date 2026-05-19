import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { PlatformRole, UserStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../dashboard/phone.util';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkPhoneNumber {
  id: string;
  phone_number: string;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  phone_numbers: ClerkPhoneNumber[];
  primary_phone_number_id: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

const SUPPORTED_EVENTS = new Set(['user.created', 'user.updated']);

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleEvent(
    rawBody: Buffer,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ): Promise<void> {
    const secret = this.configService.getOrThrow<string>(
      'CLERK_WEBHOOK_SECRET',
    );

    const event = this.verifyWebhook(rawBody, secret, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    if (!SUPPORTED_EVENTS.has(event.type)) {
      return;
    }

    const email = this.extractPrimaryEmail(event.data);
    const phone = this.extractPrimaryPhone(event.data);

    await this.upsertUser(event.data.id, email, phone);
  }

  protected verifyWebhook(
    rawBody: Buffer,
    secret: string,
    headers: SvixHeaders,
  ): ClerkWebhookEvent {
    try {
      const wh = new Webhook(secret);
      return wh.verify(rawBody, headers) as ClerkWebhookEvent;
    } catch {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private extractPrimaryEmail(data: ClerkUserData): string | null {
    if (!data.primary_email_address_id) return null;
    const primary = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );
    return primary?.email_address ?? null;
  }

  private extractPrimaryPhone(data: ClerkUserData): string | null {
    if (!data.primary_phone_number_id && data.phone_numbers.length === 0) {
      return null;
    }
    const primary =
      data.phone_numbers.find((p) => p.id === data.primary_phone_number_id) ??
      data.phone_numbers[0];
    return primary?.phone_number ?? null;
  }

  private async upsertUser(
    clerkUserId: string,
    email: string | null,
    rawPhone: string | null,
  ): Promise<void> {
    let phoneNormalized: string | null = null;
    if (rawPhone) {
      try {
        phoneNormalized = normalizePhone(rawPhone);
      } catch {
        this.logger.warn(
          `Webhook: cannot normalize phone "${rawPhone}" for clerkUserId=${clerkUserId}`,
        );
      }
    }

    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (byClerkId) {
      // Update email and/or phone if changed
      const updates: Record<string, unknown> = {};
      if (email !== null && byClerkId.email !== email) updates['email'] = email;
      if (
        phoneNormalized !== null &&
        byClerkId.phoneNormalized !== phoneNormalized
      ) {
        updates['phoneNormalized'] = phoneNormalized;
      }
      if (Object.keys(updates).length > 0) {
        await this.prisma.user.update({
          where: { id: byClerkId.id },
          data: updates,
        });
      }
      return;
    }

    // No existing user — try to link by phone then email
    if (phoneNormalized) {
      const byPhone = await this.prisma.user.findUnique({
        where: { phoneNormalized },
      });
      if (byPhone && !byPhone.clerkUserId) {
        await this.prisma.user.update({
          where: { id: byPhone.id },
          data: {
            clerkUserId,
            status: UserStatus.ACTIVE,
            ...(email && { email }),
          },
        });
        return;
      }
    }

    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail && !byEmail.clerkUserId) {
        await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            clerkUserId,
            status: UserStatus.ACTIVE,
            ...(phoneNormalized && { phoneNormalized }),
          },
        });
        return;
      }
    }

    if (!phoneNormalized) {
      this.logger.warn(
        `Webhook: skipping user creation for clerkUserId=${clerkUserId} — no valid phone number`,
      );
      // Throw so Clerk will retry; operator must add phone to Clerk user
      throw new BadRequestException(
        'Cannot create internal user without a phone number',
      );
    }

    await this.prisma.user.create({
      data: {
        clerkUserId,
        email,
        phoneNormalized,
        status: UserStatus.ACTIVE,
        platformRole: PlatformRole.USER,
      },
    });
  }
}
