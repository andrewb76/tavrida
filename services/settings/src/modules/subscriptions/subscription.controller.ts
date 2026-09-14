import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ActivateSubscriptionDto, CancelAutoRenewDto } from './dto/subscriptions.dto';
import { SubscriptionService } from './subscription.service';

@Controller('internal/v1/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  @Get()
  get(@Query('userId') userId: string) {
    return this.subscription.getByUser(userId);
  }

  @Post('activate')
  activate(@Body() body: ActivateSubscriptionDto) {
    return this.subscription.activate(body);
  }

  @Post('cancel-auto-renew')
  cancelAutoRenew(@Body() body: CancelAutoRenewDto) {
    return this.subscription.cancelAutoRenew(body.userId);
  }

  @Post('renew/run')
  runRenew() {
    return this.subscription.renewDue();
  }
}
