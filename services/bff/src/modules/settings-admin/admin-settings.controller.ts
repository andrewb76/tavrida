import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Response } from 'express';
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

class UpdateParameterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['system-var', 'tarif-var', 'limited-user-var', 'user-var']) category?: string;
  @IsOptional() @IsString() paramType?: string;
  @IsOptional() defaultValue?: unknown;
  @IsOptional() @IsBoolean() userOverride?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

class GrantLimitDto {
  @IsString() userId!: string;
  @IsString() key!: string;
  @IsString() period!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() reason?: string;
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

  @Get('services')
  listServices() {
    return this.client.listServices();
  }

  @Get('parameters')
  listParameters(
    @Query('service') service?: string,
    @Query('category') category?: string,
  ) {
    return this.client.listParameters(service, category);
  }

  @Get('parameters/:key')
  getParameter(@Param('key') key: string) {
    return this.client.getParameter(key);
  }

  @Post('parameters')
  registerParameter(@Body() body: RegisterParameterDto) {
    return this.client.registerParameter(body);
  }

  @Patch('parameters/:key')
  updateParameter(@Param('key') key: string, @Body() body: UpdateParameterDto) {
    return this.client.updateParameter(key, body);
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

  @Get('user-limits')
  getUserLimits(@Query('planId') planId?: string) {
    return this.client.getUserLimits(planId);
  }

  @Get('user-limits/:userId')
  getUserLimitsByUser(@Param('userId') userId: string) {
    return this.client.getUserLimitsByUser(userId);
  }

  @Post('user-limits/grant')
  grantLimit(@Body() body: GrantLimitDto) {
    return this.client.grantLimit(body);
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

  @Post('yaml/export')
  async exportYaml(@Res() res: Response) {
    const [parameters, plans, planValues, systemValues] = await Promise.all([
      this.client.listParameters(),
      this.client.listAllPlans(),
      this.client.getPlanValues(),
      this.client.getAllSystemValues(),
    ]);

    const yamlParts: string[] = ['version: "1.0"', '', 'plans:'];
    for (const plan of plans as Record<string, unknown>[]) {
      yamlParts.push(`  - id: ${plan.id}`);
      yamlParts.push(`    title: "${plan.title}"`);
      if (plan.description) yamlParts.push(`    description: "${plan.description}"`);
      yamlParts.push(`    monthlyPrice: ${plan.monthlyPrice}`);
      yamlParts.push(`    yearlyPrice: ${plan.yearlyPrice}`);
      yamlParts.push(`    isActive: ${plan.isActive}`);
      yamlParts.push(`    sortOrder: ${plan.sortOrder ?? 0}`);
      yamlParts.push('');
    }

    yamlParts.push('parameters:');
    const pvMap = new Map<string, Record<string, unknown>>();
    for (const pv of (planValues as Record<string, unknown>[]) ?? []) {
      const key = String(pv.paramKey);
      if (!pvMap.has(key)) pvMap.set(key, {});
      pvMap.get(key)![String(pv.planId)] = pv.value;
    }
    const svMap = new Map<string, unknown>();
    for (const sv of (systemValues as Record<string, unknown>[]) ?? []) {
      svMap.set(String(sv.paramKey), sv.value);
    }

    for (const param of (parameters as Record<string, unknown>[]) ?? []) {
      const paramKey = String(param.key);
      yamlParts.push(`  - key: ${paramKey}`);
      yamlParts.push(`    service: ${param.service}`);
      yamlParts.push(`    category: ${param.category}`);
      yamlParts.push(`    name: "${param.name}"`);
      if (param.description) yamlParts.push(`    description: "${param.description}"`);
      yamlParts.push(`    paramType: ${param.paramType}`);
      yamlParts.push(`    userOverride: ${param.userOverride ?? false}`);
      yamlParts.push(`    sortOrder: ${param.sortOrder ?? 0}`);
      if (svMap.has(paramKey)) {
        yamlParts.push(`    systemValue: ${JSON.stringify(svMap.get(paramKey))}`);
      }
      if (pvMap.has(paramKey)) {
        yamlParts.push(`    planValues:`);
        for (const [planId, value] of Object.entries(pvMap.get(paramKey)!)) {
          yamlParts.push(`      ${planId}: ${JSON.stringify(value)}`);
        }
      }
      if (param.defaultValue) {
        yamlParts.push(`    defaultValue: ${JSON.stringify(param.defaultValue)}`);
      }
      yamlParts.push('');
    }

    const yaml = yamlParts.join('\n');
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="settings-${new Date().toISOString().slice(0, 10)}.yaml"`);
    res.send(yaml);
  }

  @Post('yaml/import')
  async importYaml(@Body() body: { yaml: string }) {
    const lines = body.yaml.split('\n');
    const result = {
      created: { parameters: 0, plans: 0, values: 0 },
      updated: { parameters: 0, plans: 0, values: 0 },
      errors: [] as string[],
    };

    let currentSection = '';
    let currentItem: Record<string, unknown> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed === 'plans:') { currentSection = 'plans'; continue; }
      if (trimmed === 'parameters:') { currentSection = 'parameters'; continue; }

      if (trimmed.startsWith('- ')) {
        if (currentSection === 'plans' && currentItem.id) {
          try {
            await this.client.createPlan(currentItem);
            result.created.plans++;
          } catch {
            try {
              await this.client.updatePlan(currentItem.id as string, currentItem);
              result.updated.plans++;
            } catch (e) {
              result.errors.push(`plan ${currentItem.id}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          currentItem = {};
        }
        if (currentSection === 'parameters' && currentItem.key) {
          try {
            await this.client.registerParameter(currentItem);
            result.created.parameters++;
          } catch {
            result.updated.parameters++;
          }
          currentItem = {};
        }
      }

      const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
      if (kvMatch) {
        const [, k, v] = kvMatch;
        if (k === 'planValues' || k === 'defaultValue') {
          try { currentItem[k] = JSON.parse(v); } catch { currentItem[k] = v; }
        } else if (v === 'true') currentItem[k] = true;
        else if (v === 'false') currentItem[k] = false;
        else if (!isNaN(Number(v))) currentItem[k] = Number(v);
        else currentItem[k] = v.replace(/^"|"$/g, '');
      }
    }

    if (currentSection === 'plans' && currentItem.id) {
      try {
        await this.client.createPlan(currentItem);
        result.created.plans++;
      } catch {
        try {
          await this.client.updatePlan(currentItem.id as string, currentItem);
          result.updated.plans++;
        } catch (e) {
          result.errors.push(`plan ${currentItem.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    if (currentSection === 'parameters' && currentItem.key) {
      try {
        await this.client.registerParameter(currentItem);
        result.created.parameters++;
      } catch {
        result.updated.parameters++;
      }
    }

    return result;
  }
}
