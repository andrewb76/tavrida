import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { PlanService } from './plan.service';

@Injectable()
export class PlanValueService {
  constructor(
    @InjectRepository(PlanValueEntity)
    private readonly values: Repository<PlanValueEntity>,
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    private readonly planService: PlanService,
  ) {}

  async findAll(planId?: string, service?: string) {
    const qb = this.values.createQueryBuilder('pv');

    if (planId) {
      qb.andWhere('pv.plan_id = :planId', { planId });
    }

    if (service) {
      qb.innerJoin(ParameterEntity, 'p', 'p.key = pv.param_key AND p.service = :service', { service });
      qb.addSelect(['p.service', 'p.name', 'p.description', 'p.param_type', 'p.category']);
    }

    const rows = await qb.getMany();

    if (!service) {
      const paramKeys = rows.map((r) => r.paramKey);
      if (paramKeys.length) {
        const params = await this.parameters.find({ where: paramKeys.map((key) => ({ key })) });
        const paramMap = new Map(params.map((p) => [p.key, p]));
        return rows.map((r) => ({
          ...r,
          parameter: paramMap.get(r.paramKey) ?? null,
        }));
      }
    }

    return rows;
  }

  async resolve(userId: string, key: string) {
    const planId = await this.planService.resolvePlanId(userId);
    const pv = await this.values.findOne({ where: { planId, paramKey: key } });
    return { planId, key, value: pv?.value ?? null };
  }

  async resolvePrice(userId: string, key: string) {
    const planId = await this.planService.resolvePlanId(userId);
    const pv = await this.values.findOne({ where: { planId, paramKey: key } });

    const plan = await this.planService.findOne(planId);

    return {
      planId,
      key,
      value: pv?.value ?? null,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
    };
  }

  async upsert(planId: string, key: string, value: unknown) {
    const existing = await this.values.findOne({ where: { planId, paramKey: key } });
    if (existing) {
      existing.value = value;
      return this.values.save(existing);
    }
    return this.values.save(this.values.create({ planId, paramKey: key, value }));
  }
}
