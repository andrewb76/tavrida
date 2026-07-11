import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ParameterValueType } from '../../entities/parameter.entity';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanParameterEntity } from '../../entities/plan-parameter.entity';

export type RegisterParameterInput = {
  key: string;
  service: string;
  name: string;
  description?: string;
  valueType: ParameterValueType;
  minValue?: number | null;
  defaultValue?: number | null;
  maxValue?: number | null;
  planValues?: Record<
    string,
    { limitValue?: number | null; isFeatureEnabled?: boolean; enumValues?: string[] | null }
  >;
};

@Injectable()
export class ParametersService {
  constructor(
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    @InjectRepository(PlanParameterEntity)
    private readonly planParameters: Repository<PlanParameterEntity>,
  ) {}

  async register(input: RegisterParameterInput) {
    const parameter = await this.parameters.save(
      this.parameters.create({
        key: input.key,
        service: input.service,
        name: input.name,
        description: input.description ?? '',
        valueType: input.valueType,
        minValue: input.minValue ?? null,
        defaultValue: input.defaultValue ?? null,
        maxValue: input.maxValue ?? null,
      }),
    );

    if (input.planValues) {
      for (const [planId, values] of Object.entries(input.planValues)) {
        await this.planParameters.save(
          this.planParameters.create({
            planId,
            parameterKey: input.key,
            limitValue: values.limitValue ?? null,
            isFeatureEnabled: values.isFeatureEnabled ?? false,
            enumValues: values.enumValues ?? null,
          }),
        );
      }
    }

    return { key: parameter.key, registered: true };
  }

  async setLimit(
    planId: string,
    parameterKey: string,
    body: {
      limitValue?: number | null;
      isFeatureEnabled?: boolean;
      enumValues?: string[] | null;
    },
  ) {
    const existing = await this.planParameters.findOne({ where: { planId, parameterKey } });
    if (!existing) {
      throw new NotFoundException({
        type: 'plan_parameter_not_found',
        detail: `${planId}/${parameterKey}`,
      });
    }

    if (body.limitValue !== undefined) existing.limitValue = body.limitValue;
    if (body.isFeatureEnabled !== undefined) existing.isFeatureEnabled = body.isFeatureEnabled;
    if (body.enumValues !== undefined) existing.enumValues = body.enumValues;

    await this.planParameters.save(existing);
    return { planId, parameterKey, updated: true };
  }

  async getPlanParameter(planId: string, parameterKey: string) {
    return this.planParameters.findOne({ where: { planId, parameterKey } });
  }
}
