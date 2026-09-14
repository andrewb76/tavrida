import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePlanDto, UpdatePlanDto, UpdatePlanValueDto } from './dto/plan-values.dto';
import { PlanService } from './plan.service';
import { PlanValueService } from './plan-value.service';

@Controller('internal/v1')
export class PlanValuesController {
  constructor(
    private readonly planService: PlanService,
    private readonly planValueService: PlanValueService,
  ) {}

  @Get('plans')
  listActivePlans() {
    return this.planService.findAll(true);
  }

  @Get('plans/all')
  listAllPlans() {
    return this.planService.findAll(false);
  }

  @Get('plans/resolve')
  resolvePlan(@Query('userId') userId: string) {
    return this.planService.resolvePlanId(userId);
  }

  @Post('plans')
  createPlan(@Body() body: CreatePlanDto) {
    return this.planService.create(body);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.planService.update(id, body);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.planService.remove(id);
  }

  @Get('plan-values')
  listPlanValues(
    @Query('planId') planId?: string,
    @Query('service') service?: string,
  ) {
    return this.planValueService.findAll(planId, service);
  }

  @Patch('plan-values/:planId/:key')
  updatePlanValue(
    @Param('planId') planId: string,
    @Param('key') key: string,
    @Body() body: UpdatePlanValueDto,
  ) {
    return this.planValueService.upsert(planId, key, body.value);
  }

  @Get('plan-values/resolve')
  resolveValue(@Query('userId') userId: string, @Query('key') key: string) {
    return this.planValueService.resolve(userId, key);
  }

  @Get('plan-values/resolve-price')
  resolvePrice(@Query('userId') userId: string, @Query('key') key: string) {
    return this.planValueService.resolvePrice(userId, key);
  }
}
