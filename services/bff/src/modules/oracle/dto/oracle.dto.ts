import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanMixDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  free!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  basic!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  pro!: number;
}

export class GrowthDto {
  @IsIn(['linear', 'exponential', 'logistic_s_curve'])
  model!: 'linear' | 'exponential' | 'logistic_s_curve';

  @IsOptional()
  @IsNumber()
  @Min(0)
  registrationsPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  registrationsMonth1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyGrowthRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carryingCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  inflectionMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  steepness?: number;
}

export class CohortDto {
  @ValidateNested()
  @Type(() => PlanMixDto)
  planMix!: PlanMixDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  churnPercent!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yearlyBillingSharePercent?: number;
}

export class SubscriptionPricesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;
}

export class SubscriptionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionPricesDto)
  basic?: SubscriptionPricesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionPricesDto)
  pro?: SubscriptionPricesDto;
}

export class ActivityDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  auctionsPerUserPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  promotionAttachRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  reserveAttachRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  customPresetAttachRatePercent?: number;
}

export class ReferralDto {
  @IsOptional()
  @IsBoolean()
  programEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  attachRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxDepth?: number;
}

export class CostsDto {
  @IsOptional()
  @IsObject()
  items?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  manualTotalBurn?: number | null;
}

export class DepositsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgAmountRub?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eventsPerPayingUserPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  shareOfUsersDepositingPercent?: number;
}

export class SimulateRequestDto {
  @IsNumber()
  @Min(1)
  @Max(36)
  periodMonths!: number;

  @ValidateNested()
  @Type(() => GrowthDto)
  growth!: GrowthDto;

  @ValidateNested()
  @Type(() => CohortDto)
  cohort!: CohortDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionsDto)
  subscriptions?: SubscriptionsDto;

  @IsOptional()
  @IsObject()
  oneTimePrices?: Record<string, { amountRub?: number; enabled?: boolean }>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityDto)
  activity?: ActivityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReferralDto)
  referral?: ReferralDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CostsDto)
  costs?: CostsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DepositsDto)
  deposits?: DepositsDto;
}

export class CompareScenarioDto extends SimulateRequestDto {
  @IsString()
  scenarioId!: string;
}

export class CompareRequestDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CompareScenarioDto)
  scenarios!: CompareScenarioDto[];
}
