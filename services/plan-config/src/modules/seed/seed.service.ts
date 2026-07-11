import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SEED_PLANS,
  SEED_PLAN_VARIABLES,
  SEED_PLAN_VARIABLE_TIERS,
} from '../../config/default-seed';
import { PlanVariableEntity } from '../../entities/plan-variable.entity';
import { PlanVariableTierEntity } from '../../entities/plan-variable-tier.entity';
import { PlanEntity } from '../../entities/plan.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
    @InjectRepository(PlanVariableEntity)
    private readonly variables: Repository<PlanVariableEntity>,
    @InjectRepository(PlanVariableTierEntity)
    private readonly tiers: Repository<PlanVariableTierEntity>,
  ) {}

  async onModuleInit() {
    await this.seedPlansAndVariables();
    await this.syncVariableCatalog();
  }

  private async seedPlansAndVariables() {
    const count = await this.plans.count();
    if (count > 0) return;

    this.logger.log('Seeding default plans and plan variables…');

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

    for (const variable of SEED_PLAN_VARIABLES) {
      await this.variables.save(
        this.variables.create({
          key: variable.key,
          service: variable.service,
          name: variable.name,
          description: variable.description,
          valueType: variable.valueType,
          minValue: null,
          defaultValue: null,
          maxValue: null,
          syncStatus: 'active',
        }),
      );
    }

    for (const row of SEED_PLAN_VARIABLE_TIERS) {
      for (const planId of ['free', 'basic', 'pro'] as const) {
        const values = row[planId];
        await this.tiers.save(
          this.tiers.create({
            planId,
            variableKey: row.variableKey,
            limitValue: values.limitValue ?? null,
            isFeatureEnabled: values.isFeatureEnabled ?? false,
            enumValues: values.enumValues ?? null,
            priceAmount:
              values.priceAmount != null ? values.priceAmount.toFixed(2) : null,
            isEnabled: values.isEnabled ?? true,
          }),
        );
      }
    }

    this.logger.log('Plans/plan variables seed complete');
  }

  /** TEMPORARY until domain services own sync manifests. */
  private async syncVariableCatalog() {
    const planCount = await this.plans.count();
    if (planCount === 0) return;

    let added = 0;
    let updated = 0;

    for (const variable of SEED_PLAN_VARIABLES) {
      const existing = await this.variables.findOne({ where: { key: variable.key } });
      if (existing) {
        if (existing.name !== variable.name || existing.description !== variable.description) {
          existing.name = variable.name;
          existing.description = variable.description;
          await this.variables.save(existing);
          updated += 1;
        }
        continue;
      }

      await this.variables.save(
        this.variables.create({
          key: variable.key,
          service: variable.service,
          name: variable.name,
          description: variable.description,
          valueType: variable.valueType,
          minValue: null,
          defaultValue: null,
          maxValue: null,
          syncStatus: 'active',
        }),
      );

      const row = SEED_PLAN_VARIABLE_TIERS.find((item) => item.variableKey === variable.key);
      if (row) {
        for (const planId of ['free', 'basic', 'pro'] as const) {
          const values = row[planId];
          await this.tiers.save(
            this.tiers.create({
              planId,
              variableKey: variable.key,
              limitValue: values.limitValue ?? null,
              isFeatureEnabled: values.isFeatureEnabled ?? false,
              enumValues: values.enumValues ?? null,
              priceAmount:
                values.priceAmount != null ? values.priceAmount.toFixed(2) : null,
              isEnabled: values.isEnabled ?? true,
            }),
          );
        }
      }

      added += 1;
    }

    if (added > 0 || updated > 0) {
      this.logger.log(`Plan variable catalog sync: +${added} new, ~${updated} labels updated`);
    }
  }
}
