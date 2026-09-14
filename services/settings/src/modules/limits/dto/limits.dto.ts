import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type LimitPeriod = 'hour' | 'day' | 'week' | 'month';
export type LimitSource = 'grant' | 'purchased';

export class ConsumeLimitDto {
  @IsString()
  userId!: string;

  @IsString()
  key!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  meta?: Record<string, unknown>;
}

export class CheckLimitDto {
  @IsString()
  userId!: string;

  @IsString()
  key!: string;
}

export class GrantLimitDto {
  @IsString()
  userId!: string;

  @IsString()
  key!: string;

  @IsString()
  period!: LimitPeriod;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  source!: LimitSource;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PurchaseLimitDto {
  @IsString()
  userId!: string;

  @IsString()
  key!: string;

  @IsString()
  period!: LimitPeriod;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  billingChargeId?: string;
}
