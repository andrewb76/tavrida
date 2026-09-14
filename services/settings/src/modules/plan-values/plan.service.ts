import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import type { CreatePlanDto, UpdatePlanDto } from './dto/plan-values.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
  ) {}

  async findAll(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.plans.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findOne(id: string) {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException({ type: 'not-found', detail: `Plan ${id} not found` });
    }
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const plan = this.plans.create({
      id: dto.id,
      title: dto.title,
      description: dto.description ?? '',
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.plans.save(plan);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.findOne(id);
    Object.assign(plan, dto);
    return this.plans.save(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    await this.plans.remove(plan);
    return { id, deleted: true };
  }

  async resolvePlanId(userId: string): Promise<string> {
    const sub = await this.subscriptions.findOne({
      where: { userId, status: 'ACTIVE' },
    });
    return sub?.planId ?? 'free';
  }
}
