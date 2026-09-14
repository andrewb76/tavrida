import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActivateSubscriptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  planId!: string;

  @IsIn(['monthly', 'yearly'])
  billingPeriod!: 'monthly' | 'yearly';

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class CancelAutoRenewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;
}
