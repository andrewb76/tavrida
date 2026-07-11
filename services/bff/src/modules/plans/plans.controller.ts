import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';

class ActivatePlanDto {
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

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly planConfig: PlanConfigClient) {}

  @Get()
  list() {
    return this.planConfig.listPlans();
  }

  @Get('subscription')
  subscription(@CurrentUser() user: AuthUser) {
    return this.planConfig.getSubscription(user.sub);
  }

  @Post('activate')
  activate(@CurrentUser() user: AuthUser, @Body() body: ActivatePlanDto) {
    return this.planConfig.activatePlan({ userId: user.sub, ...body });
  }

  @Post('cancel-auto-renew')
  cancelAutoRenew(@CurrentUser() user: AuthUser) {
    return this.planConfig.cancelAutoRenew(user.sub);
  }
}
