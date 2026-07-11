import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SubscriptionsService } from './subscriptions.service';

class ActivateSubscriptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  planId!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingPeriod?: 'monthly' | 'yearly';
}

class CancelAutoRenewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;
}

@Controller('internal/v1/subscription')
export class InternalSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  get(@Query('userId') userId: string) {
    return this.subscriptions.getSubscription(userId);
  }

  @Post('activate')
  activate(@Body() body: ActivateSubscriptionDto) {
    return this.subscriptions.activate(body);
  }

  @Post('cancel-auto-renew')
  cancelAutoRenew(@Body() body: CancelAutoRenewDto) {
    return this.subscriptions.cancelAutoRenew(body.userId);
  }
}
