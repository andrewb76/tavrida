import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LogtoWebhookGuard } from './logto-webhook.guard';
import { LogtoWebhooksService } from './logto-webhooks.service';
import type { LogtoWebhookPayload } from './logto-webhook.util';

@Controller('webhooks/logto')
@UseGuards(LogtoWebhookGuard)
export class LogtoWebhooksController {
  constructor(private readonly webhooks: LogtoWebhooksService) {}

  @Post()
  receive(@Body() body: LogtoWebhookPayload) {
    return this.webhooks.handle(body);
  }
}
