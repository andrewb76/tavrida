import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PlansService } from './plans.service';

class PatchPlanDto {
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

@Controller('internal/v1/plans')
export class InternalPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  async list() {
    const data = await this.plans.listActive();
    return { data };
  }

  @Get('all')
  async listAll() {
    const data = await this.plans.listAll();
    return { data };
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: PatchPlanDto) {
    const data = await this.plans.updatePlan(id, body);
    return { data };
  }
}
