import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SEED_PARAMETERS,
  SEED_PLAN_PARAMETERS,
  SEED_PLANS,
} from '../../config/default-seed';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanParameterEntity } from '../../entities/plan-parameter.entity';
import { PlanEntity } from '../../entities/plan.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    @InjectRepository(PlanParameterEntity)
    private readonly planParameters: Repository<PlanParameterEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.plans.count();
    if (count > 0) return;

    this.logger.log('Seeding default plans and parameters…');

    for (const plan of SEED_PLANS) {
      await this.plans.save(
        this.plans.create({
          id: plan.id,
          title: plan.title,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice.toFixed(2),
          yearlyPrice: plan.yearlyPrice.toFixed(2),
          isActive: true,
        }),
      );
    }

    for (const param of SEED_PARAMETERS) {
      await this.parameters.save(
        this.parameters.create({
          key: param.key,
          service: param.service,
          name: param.name,
          description: param.description,
          valueType: param.valueType,
          minValue: null,
          defaultValue: null,
          maxValue: null,
        }),
      );
    }

    for (const row of SEED_PLAN_PARAMETERS) {
      for (const planId of ['free', 'basic', 'pro'] as const) {
        const values = row[planId];
        await this.planParameters.save(
          this.planParameters.create({
            planId,
            parameterKey: row.parameterKey,
            limitValue: values.limitValue ?? null,
            isFeatureEnabled: values.isFeatureEnabled ?? false,
            enumValues: null,
          }),
        );
      }
    }

    this.logger.log('Seed complete');
  }
}
