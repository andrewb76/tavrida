import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PlanVariableValueType } from '../../entities/plan-variable.entity';
import { PlanVariableEntity } from '../../entities/plan-variable.entity';
import { PlanVariableTierEntity } from '../../entities/plan-variable-tier.entity';

export type TierValuesInput = {
  limitValue?: number | null;
  isFeatureEnabled?: boolean;
  enumValues?: string[] | null;
  priceAmount?: number | null;
  isEnabled?: boolean;
};

export type RegisterPlanVariableInput = {
  key: string;
  service: string;
  name: string;
  description?: string;
  valueType: PlanVariableValueType;
  minValue?: number | null;
  defaultValue?: number | null;
  maxValue?: number | null;
  tierValues?: Record<string, TierValuesInput>;
};

@Injectable()
export class PlanVariablesService {
  constructor(
    @InjectRepository(PlanVariableEntity)
    private readonly variables: Repository<PlanVariableEntity>,
    @InjectRepository(PlanVariableTierEntity)
    private readonly tiers: Repository<PlanVariableTierEntity>,
  ) {}

  async register(input: RegisterPlanVariableInput) {
    await this.upsertVariable(input, 'active');
    return { key: input.key, registered: true };
  }

  async sync(input: { service: string; variables: RegisterPlanVariableInput[] }) {
    const syncedKeys: string[] = [];

    for (const variable of input.variables) {
      await this.upsertVariable({ ...variable, service: input.service }, 'active');
      syncedKeys.push(variable.key);
    }

    const stale: string[] = [];
    const rows = await this.variables.find({ where: { service: input.service } });
    for (const row of rows) {
      if (syncedKeys.includes(row.key)) continue;
      if (row.syncStatus !== 'stale') {
        row.syncStatus = 'stale';
        await this.variables.save(row);
      }
      stale.push(row.key);
    }

    return { service: input.service, synced: syncedKeys.length, stale };
  }

  async deleteVariable(variableKey: string) {
    const variable = await this.variables.findOne({ where: { key: variableKey } });
    if (!variable) {
      throw new NotFoundException({ type: 'not-found', detail: `Plan variable ${variableKey} not found` });
    }

    await this.tiers.delete({ variableKey });
    await this.variables.delete({ key: variableKey });
    return { key: variableKey, deleted: true };
  }

  async getTier(planId: string, variableKey: string) {
    return this.tiers.findOne({ where: { planId, variableKey } });
  }

  async listMatrix() {
    const variables = await this.variables.find({ order: { key: 'ASC' } });
    const tierRows = await this.tiers.find();

    const byKey = new Map(
      variables.map((variable) => [
        variable.key,
        {
          key: variable.key,
          service: variable.service,
          name: variable.name,
          description: variable.description,
          valueType: variable.valueType,
          syncStatus: variable.syncStatus,
          tiers: {} as Record<
            string,
            {
              limitValue: number | null;
              isFeatureEnabled: boolean;
              enumValues: string[] | null;
              priceAmount: number | null;
              isEnabled: boolean;
            }
          >,
        },
      ]),
    );

    for (const row of tierRows) {
      const entry = byKey.get(row.variableKey);
      if (!entry) continue;
      entry.tiers[row.planId] = {
        limitValue: row.limitValue,
        isFeatureEnabled: row.isFeatureEnabled,
        enumValues: row.enumValues,
        priceAmount: row.priceAmount != null ? Number(row.priceAmount) : null,
        isEnabled: row.isEnabled,
      };
    }

    return { data: [...byKey.values()] };
  }

  async patchMatrix(variableKey: string, tierValues: Record<string, TierValuesInput>) {
    const variable = await this.variables.findOne({ where: { key: variableKey } });
    if (!variable) {
      throw new NotFoundException({ type: 'not-found', detail: `Plan variable ${variableKey} not found` });
    }

    for (const [planId, values] of Object.entries(tierValues)) {
      const existing = await this.tiers.findOne({ where: { planId, variableKey } });
      if (!existing) {
        throw new NotFoundException({
          type: 'plan_variable_tier_not_found',
          detail: `${planId}/${variableKey}`,
        });
      }

      if (values.limitValue !== undefined) existing.limitValue = values.limitValue;
      if (values.isFeatureEnabled !== undefined) existing.isFeatureEnabled = values.isFeatureEnabled;
      if (values.enumValues !== undefined) existing.enumValues = values.enumValues;
      if (values.priceAmount !== undefined) {
        existing.priceAmount =
          values.priceAmount == null ? null : Math.max(0, values.priceAmount).toFixed(2);
      }
      if (values.isEnabled !== undefined) existing.isEnabled = values.isEnabled;

      await this.tiers.save(existing);
    }

    return { key: variableKey, updated: true };
  }

  async resolvePrice(planId: string, variableKey: string) {
    const variable = await this.variables.findOne({ where: { key: variableKey } });
    if (!variable || variable.valueType !== 'price') {
      throw new NotFoundException({ type: 'not-found', detail: `Price variable ${variableKey} not found` });
    }

    const tier = await this.tiers.findOne({ where: { planId, variableKey } });
    if (!tier || !tier.isEnabled) {
      throw new ForbiddenException({
        type: 'price_not_available',
        detail: `Price ${variableKey} is not available for plan ${planId}`,
      });
    }

    const amount = tier.priceAmount != null ? Number(tier.priceAmount) : 0;
    if (amount <= 0) {
      throw new ForbiddenException({
        type: 'price_not_available',
        detail: `Price ${variableKey} has zero amount for plan ${planId}`,
      });
    }

    return {
      key: variableKey,
      planId,
      amount,
      currency: 'RUB',
      name: variable.name,
    };
  }

  private async upsertVariable(
    input: RegisterPlanVariableInput,
    syncStatus: 'active' | 'stale',
  ) {
    const existing = await this.variables.findOne({ where: { key: input.key } });
    if (existing) {
      existing.service = input.service;
      existing.name = input.name;
      existing.description = input.description ?? '';
      existing.valueType = input.valueType;
      existing.minValue = input.minValue ?? null;
      existing.defaultValue = input.defaultValue ?? null;
      existing.maxValue = input.maxValue ?? null;
      existing.syncStatus = syncStatus;
      await this.variables.save(existing);
    } else {
      await this.variables.save(
        this.variables.create({
          key: input.key,
          service: input.service,
          name: input.name,
          description: input.description ?? '',
          valueType: input.valueType,
          minValue: input.minValue ?? null,
          defaultValue: input.defaultValue ?? null,
          maxValue: input.maxValue ?? null,
          syncStatus,
        }),
      );
    }

    if (!input.tierValues) return;

    for (const [planId, values] of Object.entries(input.tierValues)) {
      const tier = await this.tiers.findOne({ where: { planId, variableKey: input.key } });
      if (tier) continue;

      await this.tiers.save(
        this.tiers.create({
          planId,
          variableKey: input.key,
          limitValue: values.limitValue ?? null,
          isFeatureEnabled: values.isFeatureEnabled ?? false,
          enumValues: values.enumValues ?? null,
          priceAmount:
            values.priceAmount != null ? Math.max(0, values.priceAmount).toFixed(2) : null,
          isEnabled: values.isEnabled ?? true,
        }),
      );
    }
  }
}
