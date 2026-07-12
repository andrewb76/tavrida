import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';

class PatchPlanBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class TierValueBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limitValue?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatureEnabled?: boolean;

  @IsOptional()
  enumValues?: string[] | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceAmount?: number | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

class PatchVariableBodyDto {
  @IsObject()
  tierValues!: Record<string, TierValueBodyDto>;
}

@Controller('admin/plan-config')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPlanConfigController {
  constructor(private readonly planConfig: PlanConfigClient) {}

  @Get('plans')
  listPlans() {
    return this.planConfig.listAllPlans().then((data) => ({ data }));
  }

  @Patch('plans/:id')
  patchPlan(@Param('id') id: string, @Body() body: PatchPlanBodyDto) {
    return this.planConfig.updatePlan(id, body).then((data) => ({ data }));
  }

  @Get('variables')
  listVariables() {
    return this.planConfig.listVariables().then((data) => ({ data }));
  }

  @Patch('variables/:key')
  patchVariable(@Param('key') key: string, @Body() body: PatchVariableBodyDto) {
    return this.planConfig.patchVariable(key, body.tierValues);
  }

  @Delete('variables/:key')
  deleteVariable(@Param('key') key: string) {
    return this.planConfig.deleteVariable(key);
  }
}
