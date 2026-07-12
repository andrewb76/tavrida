import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PlanVariablesService } from './plan-variables.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

class TierValueDto {
  @IsOptional()
  @IsInt()
  limitValue?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatureEnabled?: boolean;

  @IsOptional()
  enumValues?: string[] | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

class RegisterPlanVariableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  service!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['limit', 'feature', 'enum', 'price'])
  valueType!: 'limit' | 'feature' | 'enum' | 'price';

  @IsOptional()
  @IsInt()
  minValue?: number | null;

  @IsOptional()
  @IsInt()
  defaultValue?: number | null;

  @IsOptional()
  @IsInt()
  maxValue?: number | null;

  @IsOptional()
  @IsObject()
  tierValues?: Record<string, TierValueDto>;
}

class SyncPlanVariablesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  service!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => RegisterPlanVariableDto)
  variables!: RegisterPlanVariableDto[];
}

class PatchPlanVariableMatrixDto {
  @IsObject()
  tierValues!: Record<string, TierValueDto>;
}

@Controller('internal/v1/plan-variables')
export class InternalPlanVariablesController {
  constructor(
    private readonly planVariables: PlanVariablesService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get()
  list() {
    return this.planVariables.listMatrix();
  }

  @Post('register')
  register(@Body() body: RegisterPlanVariableDto) {
    return this.planVariables.register(body);
  }

  @Post('sync')
  sync(@Body() body: SyncPlanVariablesDto) {
    return this.planVariables.sync(body);
  }

  @Get('resolve-price')
  resolvePrice(
    @Query('userId') userId: string,
    @Query('key') key: string,
    @Query('planId') planId?: string,
  ) {
    if (planId) {
      return this.planVariables.resolvePrice(planId, key);
    }
    return this.subscriptions.resolvePlanId(userId).then((resolvedPlanId) =>
      this.planVariables.resolvePrice(resolvedPlanId, key),
    );
  }

  @Patch(':key')
  patchMatrix(@Param('key') key: string, @Body() body: PatchPlanVariableMatrixDto) {
    return this.planVariables.patchMatrix(key, body.tierValues);
  }

  @Delete(':key')
  deleteVariable(@Param('key') key: string) {
    return this.planVariables.deleteVariable(key);
  }
}
