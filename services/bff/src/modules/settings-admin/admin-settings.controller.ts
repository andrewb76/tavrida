import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsClient } from './settings.client';

class CreatePlanDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() monthlyPrice!: number;
  @IsNumber() yearlyPrice!: number;
  @IsBoolean() isActive!: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

class UpdatePlanDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() monthlyPrice?: number;
  @IsOptional() @IsNumber() yearlyPrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

class RegisterParameterDto {
  @IsString() key!: string;
  @IsString() service!: string;
  @IsIn(['system-var', 'tarif-var', 'limited-user-var', 'user-var']) category!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() paramType!: string;
  @IsOptional() defaultValue?: unknown;
  @IsOptional() @IsBoolean() userOverride?: boolean;
  @IsOptional() @IsObject() planValues?: Record<string, unknown>;
}

class PatchSystemValuesDto {
  @IsObject() values!: Record<string, unknown>;
  @IsOptional() @IsString() updatedBy?: string;
}

class PatchUserValueDto {
  @IsOptional() value?: unknown;
}

class SetPlanValueDto {
  value!: unknown;
}

class CheckLimitDto {
  @IsString() userId!: string;
  @IsString() key!: string;
}

class ConsumeLimitDto {
  @IsString() userId!: string;
  @IsString() key!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() meta?: Record<string, unknown>;
}

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSettingsController {
  constructor(private readonly client: SettingsClient) {}

  @Get('plans')
  listPlans() {
    return this.client.listAllPlans();
  }

  @Post('plans')
  createPlan(@Body() body: CreatePlanDto) {
    return this.client.createPlan(body);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.client.updatePlan(id, body);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.client.deletePlan(id);
  }

  @Get('parameters')
  listParameters(@Query('service') service?: string) {
    return this.client.listParameters(service);
  }

  @Post('parameters')
  registerParameter(@Body() body: RegisterParameterDto) {
    return this.client.registerParameter(body);
  }

  @Delete('parameters/:key')
  deleteParameter(@Param('key') key: string) {
    return this.client.deleteParameter(key);
  }

  @Get('system-values/:domain')
  getSystemValues(@Param('domain') domain: string) {
    return this.client.getSystemValues(domain);
  }

  @Post('system-values/:domain')
  patchSystemValues(
    @Param('domain') domain: string,
    @Body() body: PatchSystemValuesDto,
  ) {
    return this.client.patchSystemValues(domain, body.values);
  }

  @Get('user-values/:userId')
  getUserValues(@Param('userId') userId: string) {
    return this.client.getUserValues(userId);
  }

  @Get('user-values/:userId/:key')
  getUserValue(@Param('userId') userId: string, @Param('key') key: string) {
    return this.client.getUserValue(userId, key);
  }

  @Patch('user-values/:userId/:key')
  setUserValue(
    @Param('userId') userId: string,
    @Param('key') key: string,
    @Body() body: PatchUserValueDto,
  ) {
    return this.client.setUserValue(userId, key, body);
  }

  @Delete('user-values/:userId/:key')
  deleteUserValue(@Param('userId') userId: string, @Param('key') key: string) {
    return this.client.deleteUserValue(userId, key);
  }

  @Get('plan-values')
  getPlanValues(@Query('planId') planId?: string) {
    return this.client.getPlanValues(planId);
  }

  @Patch('plan-values/:planId/:key')
  setPlanValue(
    @Param('planId') planId: string,
    @Param('key') key: string,
    @Body() body: SetPlanValueDto,
  ) {
    return this.client.setPlanValue(planId, key, body);
  }

  @Get('limits/state')
  getLimitState(@Query('userId') userId: string, @Query('key') key?: string) {
    return this.client.getLimitState(userId, key);
  }

  @Post('limits/check')
  checkLimit(@Body() body: CheckLimitDto) {
    return this.client.checkLimit(body);
  }

  @Post('limits/consume')
  consumeLimit(@Body() body: ConsumeLimitDto) {
    return this.client.consumeLimit(body);
  }

  @Get('limits/usage-log')
  getUsageLog(
    @Query('userId') userId?: string,
    @Query('key') key?: string,
    @Query('period') period?: string,
    @Query('source') source?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (key) params.key = key;
    if (period) params.period = period;
    if (source) params.source = source;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;
    return this.client.getUsageLog(params);
  }
}
