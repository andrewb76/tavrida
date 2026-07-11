import { Injectable, NotFoundException } from '@nestjs/common';
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

    return rows.map((plan) => this.toSummary(plan));
  }

  async listAll() {
    const rows = await this.plans.find({ order: { monthlyPrice: 'ASC' } });
    return rows.map((plan) => this.toSummary(plan));
  }

  async updatePlan(
    planId: string,
    patch: {
      title?: string;
      description?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      isActive?: boolean;
    },
  ) {
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException({ type: 'not-found', detail: `Plan ${planId} not found` });
    }

    if (patch.title !== undefined) plan.title = patch.title;
    if (patch.description !== undefined) plan.description = patch.description;
    if (patch.monthlyPrice !== undefined) plan.monthlyPrice = String(patch.monthlyPrice);
    if (patch.yearlyPrice !== undefined) plan.yearlyPrice = String(patch.yearlyPrice);
    if (patch.isActive !== undefined) plan.isActive = patch.isActive;

    await this.plans.save(plan);
    return this.toSummary(plan);
  }

  async findById(planId: string) {
    return this.plans.findOne({ where: { id: planId, isActive: true } });
  }

  private toSummary(plan: PlanEntity) {
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: Number(plan.yearlyPrice),
      isActive: plan.isActive,
    };
  }
}
