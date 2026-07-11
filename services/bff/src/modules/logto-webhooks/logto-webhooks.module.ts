import { Module } from '@nestjs/common';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { LogtoWebhookGuard } from './logto-webhook.guard';
import { LogtoWebhooksController } from './logto-webhooks.controller';
import { LogtoWebhooksService } from './logto-webhooks.service';

@Module({
  imports: [UserProfileModule],
  controllers: [LogtoWebhooksController],
  providers: [LogtoWebhooksService, LogtoWebhookGuard],
})
export class LogtoWebhooksModule {}
