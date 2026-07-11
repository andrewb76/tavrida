import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialPolicyClient } from '../financial-policy/financial-policy.client';

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
  constructor(private readonly fp: FinancialPolicyClient) {}

  @Get()
  list() {
    return this.fp.listPlans();
  }

  @Get('subscription')
  subscription(@CurrentUser() user: AuthUser) {
    return this.fp.getSubscription(user.sub);
  }

  @Post('activate')
  activate(@CurrentUser() user: AuthUser, @Body() body: ActivatePlanDto) {
    return this.fp.activatePlan({ userId: user.sub, ...body });
  }
}
