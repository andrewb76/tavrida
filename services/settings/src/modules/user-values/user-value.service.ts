import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { UserValueEntity } from '../../entities/user-value.entity';

@Injectable()
export class UserValueService {
  constructor(
    @InjectRepository(UserValueEntity)
    private readonly userValues: Repository<UserValueEntity>,
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    @InjectRepository(SystemValueEntity)
    private readonly systemValues: Repository<SystemValueEntity>,
    @InjectRepository(PlanValueEntity)
    private readonly planValues: Repository<PlanValueEntity>,
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
  ) {}

  async getValues(userId: string) {
    const rows = await this.userValues.find({ where: { userId } });
    return { data: rows };
  }

  async getValue(userId: string, key: string) {
    const row = await this.userValues.findOne({ where: { userId, paramKey: key } });
    if (!row) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `User value ${key} not found for user ${userId}`,
      });
    }
    return row;
  }

  async upsert(userId: string, key: string, value: unknown) {
    await this.userValues.save({ userId, paramKey: key, value });
    return { userId, paramKey: key, upserted: true };
  }

  async remove(userId: string, key: string) {
    const existing = await this.userValues.findOne({ where: { userId, paramKey: key } });
    if (!existing) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `User value ${key} not found for user ${userId}`,
      });
    }
    await this.userValues.delete({ userId, paramKey: key });
    return { userId, paramKey: key, deleted: true };
  }

  async resolveForUser(userId: string, key: string) {
    const userValue = await this.userValues.findOne({ where: { userId, paramKey: key } });
    if (userValue) {
      return { key, value: userValue.value, source: 'user_value' };
    }

    const param = await this.parameters.findOne({ where: { key } });
    if (!param) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Parameter ${key} not found`,
      });
    }

    if (param.category === 'system-var') {
      const sys = await this.systemValues.findOne({ where: { paramKey: key } });
      return { key, value: sys?.value ?? param.defaultValue, source: 'system_value' };
    }

    if (param.category === 'tarif-var') {
      const sub = await this.subscriptions.findOne({ where: { userId } });
      if (sub) {
        const pv = await this.planValues.findOne({ where: { planId: sub.planId, paramKey: key } });
        if (pv) {
          return { key, value: pv.value, source: 'plan_value' };
        }
      }
    }

    return { key, value: param.defaultValue, source: 'default_value' };
  }
}
