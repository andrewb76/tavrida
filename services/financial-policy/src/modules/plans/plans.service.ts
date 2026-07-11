import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanEntity } from '../../entities/plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
  ) {}

  async listActive() {
    const rows = await this.plans.find({
      where: { isActive: true },
      order: { monthlyPrice: 'ASC' },
    });

    return rows.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: Number(plan.yearlyPrice),
      isActive: plan.isActive,
    }));
  }

  async findById(planId: string) {
    return this.plans.findOne({ where: { id: planId, isActive: true } });
  }
}
