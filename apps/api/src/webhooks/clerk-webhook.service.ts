import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
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
    await this.upsertUser(event.data.id, email);
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

  private extractPrimaryEmail(data: ClerkUserData): string {
    const primary = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );
    if (!primary) {
      throw new BadRequestException('Clerk user has no primary email address');
    }
    return primary.email_address;
  }

  private async upsertUser(clerkUserId: string, email: string): Promise<void> {
    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });
    if (byClerkId) {
      if (byClerkId.email !== email) {
        await this.prisma.user.update({
          where: { id: byClerkId.id },
          data: { email },
        });
      }
      return;
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { clerkUserId, status: 'ACTIVE' },
      });
      return;
    }

    await this.prisma.user.create({
      data: {
        clerkUserId,
        email,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
  }
}
