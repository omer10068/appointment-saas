import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBody,
} from '@nestjs/common';
import { ClerkWebhookService } from './clerk-webhook.service';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ): Promise<{ received: boolean }> {
    await this.clerkWebhookService.handleEvent(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
    );
    return { received: true };
  }
}
