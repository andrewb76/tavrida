import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LimitPurchaseEntity } from '../../entities/limit-purchase.entity';
import { LimitUsageLogEntity } from '../../entities/limit-usage-log.entity';
import { ParameterEntity } from '../../entities/parameter.entity';
import { UserLimitEntity } from '../../entities/user-limit.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import type {
  CheckLimitDto,
  ConsumeLimitDto,
  GrantLimitDto,
  LimitPeriod,
  PurchaseLimitDto,
} from './dto/limits.dto';

const PERIOD_MS: Record<LimitPeriod, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export interface PeriodConsumeResult {
  period: LimitPeriod;
  ok: boolean;
  remaining: number;
  maxValue: number;
  purchasedUsed?: number;
  error?: string;
}

export interface PeriodCheckResult {
  period: LimitPeriod;
  allowed: boolean;
  remaining: number;
  maxValue: number;
  purchasedAvailable: number;
}

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(
    @InjectRepository(UserLimitEntity)
    private readonly userLimits: Repository<UserLimitEntity>,
    @InjectRepository(LimitUsageLogEntity)
    private readonly usageLogs: Repository<LimitUsageLogEntity>,
    @InjectRepository(LimitPurchaseEntity)
    private readonly purchases: Repository<LimitPurchaseEntity>,
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
  ) {}

  async consume(
    dto: ConsumeLimitDto,
  ): Promise<{ results: PeriodConsumeResult[] }> {
    const periods = await this.lookupPeriods(dto.key);
    const results: PeriodConsumeResult[] = [];

    for (const { period, maxValue } of periods) {
      for (let i = 0; i < dto.amount; i++) {
        try {
          const result = await this.consumeSingle(dto.userId, dto.key, period, maxValue);
          results.push(result);
          if (!result.ok) break;
        } catch (err) {
          results.push({
            period,
            ok: false,
            remaining: 0,
            maxValue,
            error: err instanceof Error ? err.message : String(err),
          });
          break;
        }
      }
    }

    return { results };
  }

  async check(dto: CheckLimitDto): Promise<{ results: PeriodCheckResult[] }> {
    const periods = await this.lookupPeriods(dto.key);
    const results: PeriodCheckResult[] = [];

    for (const { period, maxValue } of periods) {
      const planId = await this.resolvePlanId(dto.userId);

      let entity = await this.userLimits.findOne({
        where: {
          paramKey: dto.key,
          planId,
          userId: dto.userId,
          period,
        },
      });

      if (entity) {
        entity = await this.restoreIfNeeded(entity);
      }

      const baseRemaining = entity ? entity.remaining : maxValue;

      const purchasedAvailable = await this.getPurchasedAvailable(
        dto.userId,
        dto.key,
        period,
      );

      results.push({
        period,
        allowed: baseRemaining > 0 || purchasedAvailable > 0,
        remaining: baseRemaining,
        maxValue,
        purchasedAvailable,
      });
    }

    return { results };
  }

  async grant(dto: GrantLimitDto): Promise<{ granted: boolean; remaining: number }> {
    const planId = await this.resolvePlanId(dto.userId);
    const maxValue = await this.resolveMaxValue(dto.key, planId, dto.period);
    const now = new Date();

    let entity = await this.userLimits.findOne({
      where: {
        paramKey: dto.key,
        planId,
        userId: dto.userId,
        period: dto.period,
      },
    });

    if (entity) {
      entity = await this.restoreIfNeeded(entity);
      entity.remaining += dto.amount;
    } else {
      entity = this.userLimits.create({
        paramKey: dto.key,
        planId,
        userId: dto.userId,
        period: dto.period,
        maxValue,
        remaining: maxValue + dto.amount,
        cycleStart: now,
        cycleEnd: this.calculateCycleEnd(now, dto.period),
      });
    }

    await this.userLimits.save(entity);

    await this.logUsage({
      paramKey: dto.key,
      planId,
      userId: dto.userId,
      period: dto.period,
      delta: dto.amount,
      remainingAfter: entity.remaining,
      source: dto.source,
      meta: { reason: dto.reason },
    });

    this.logger.log(
      `Granted ${dto.amount} for ${dto.userId}/${dto.key}/${dto.period}, remaining=${entity.remaining}`,
    );

    return { granted: true, remaining: entity.remaining };
  }

  async purchase(dto: PurchaseLimitDto): Promise<{ purchaseId: string }> {
    const purchase = this.purchases.create({
      id: crypto.randomUUID(),
      paramKey: dto.key,
      userId: dto.userId,
      period: dto.period,
      purchased: dto.amount,
      used: 0,
      expiresAt: this.calculateCycleEnd(new Date(), dto.period),
      meta: { unitPrice: dto.unitPrice, billingChargeId: dto.billingChargeId },
    });

    await this.purchases.save(purchase);

    this.logger.log(
      `Purchase recorded: ${dto.amount} for ${dto.userId}/${dto.key}/${dto.period}, id=${purchase.id}`,
    );

    return { purchaseId: purchase.id };
  }

  async getState(
    userId: string,
    key?: string,
  ): Promise<{ limits: UserLimitEntity[] }> {
    const where: Record<string, string> = { userId };
    if (key) where.paramKey = key;

    const limits = await this.userLimits.find({ where, order: { period: 'ASC' } });
    return { limits };
  }

  async getUsageLog(filters: {
    userId?: string;
    key?: string;
    period?: LimitPeriod;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: LimitUsageLogEntity[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;

    const qb = this.usageLogs.createQueryBuilder('log');

    if (filters.userId) qb.andWhere('log.user_id = :userId', { userId: filters.userId });
    if (filters.key) qb.andWhere('log.param_key = :key', { key: filters.key });
    if (filters.period) qb.andWhere('log.period = :period', { period: filters.period });
    if (filters.source) qb.andWhere('log.source = :source', { source: filters.source });
    if (filters.dateFrom) qb.andWhere('log.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('log.created_at <= :dateTo', { dateTo: filters.dateTo });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { data, total, page, pageSize };
  }

  async restoreIfNeeded(entity: UserLimitEntity): Promise<UserLimitEntity> {
    const now = new Date();
    if (entity.cycleEnd.getTime() <= now.getTime()) {
      const newCycleStart = now;
      const newCycleEnd = this.calculateCycleEnd(now, entity.period as LimitPeriod);

      entity.remaining = entity.maxValue;
      entity.cycleStart = newCycleStart;
      entity.cycleEnd = newCycleEnd;

      await this.userLimits.save(entity);

      await this.logUsage({
        paramKey: entity.paramKey,
        planId: entity.planId,
        userId: entity.userId,
        period: entity.period,
        delta: 0,
        remainingAfter: entity.remaining,
        source: 'restore',
        meta: { oldCycleEnd: entity.cycleEnd },
      });

      this.logger.log(
        `Restored limit ${entity.userId}/${entity.paramKey}/${entity.period}: remaining=${entity.remaining}`,
      );
    }
    return entity;
  }

  calculateCycleEnd(start: Date, period: LimitPeriod): Date {
    const end = new Date(start);
    switch (period) {
      case 'hour':
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case 'month':
        end.setMonth(end.getMonth() + 1);
        break;
    }
    return end;
  }

  private async lookupPeriods(
    key: string,
  ): Promise<{ period: LimitPeriod; maxValue: number }[]> {
    const param = await this.parameters.findOne({ where: { key } });
    if (!param) {
      throw new BadRequestException(`Parameter ${key} not found`);
    }

    const def = param.defaultValue as Record<string, unknown> | null;

    if (param.category === 'limited-user-var' && def && 'periods' in def) {
      const periods = def.periods as Array<{ period: string; max_value: number }>;
      return periods.map((p) => ({
        period: p.period as LimitPeriod,
        maxValue: p.max_value,
      }));
    }

    if (param.category === 'tarif-var') {
      return [{ period: 'day' as LimitPeriod, maxValue: 0 }];
    }

    throw new BadRequestException(
      `Parameter ${key} is not a limit parameter (category=${param.category})`,
    );
  }

  private async consumeSingle(
    userId: string,
    key: string,
    period: LimitPeriod,
    maxValue: number,
  ): Promise<PeriodConsumeResult> {
    const planId = await this.resolvePlanId(userId);

    let entity = await this.userLimits.findOne({
      where: { paramKey: key, planId, userId, period },
    });

    if (entity) {
      entity = await this.restoreIfNeeded(entity);
    } else {
      const now = new Date();
      entity = this.userLimits.create({
        paramKey: key,
        planId,
        userId,
        period,
        maxValue,
        remaining: maxValue,
        cycleStart: now,
        cycleEnd: this.calculateCycleEnd(now, period),
      });
      await this.userLimits.save(entity);
    }

    if (entity.remaining > 0) {
      entity.remaining -= 1;
      await this.userLimits.save(entity);

      await this.logUsage({
        paramKey: key,
        planId,
        userId,
        period,
        delta: -1,
        remainingAfter: entity.remaining,
        source: 'base',
      });

      return { period, ok: true, remaining: entity.remaining, maxValue };
    }

    const purchasedUsed = await this.tryConsumePurchased(userId, key, period);
    if (purchasedUsed !== null) {
      return { period, ok: true, remaining: entity.remaining, maxValue, purchasedUsed };
    }

    return { period, ok: false, remaining: 0, maxValue, error: 'limit-exhausted' };
  }

  private async tryConsumePurchased(
    userId: string,
    key: string,
    period: LimitPeriod,
  ): Promise<number | null> {
    const purchase = await this.purchases.findOne({
      where: {
        paramKey: key,
        userId,
        period,
      },
      order: { createdAt: 'ASC' },
    });

    if (!purchase) return null;

    const available = purchase.purchased - purchase.used;
    if (available <= 0) return null;

    purchase.used += 1;
    await this.purchases.save(purchase);

    await this.logUsage({
      paramKey: key,
      planId: '',
      userId,
      period,
      delta: -1,
      remainingAfter: available - 1,
      source: 'purchased',
      meta: { purchaseId: purchase.id },
    });

    return purchase.used;
  }

  private async getPurchasedAvailable(
    userId: string,
    key: string,
    period: LimitPeriod,
  ): Promise<number> {
    const purchases = await this.purchases.find({
      where: { paramKey: key, userId, period },
    });

    return purchases.reduce((sum, p) => sum + (p.purchased - p.used), 0);
  }

  private async resolvePlanId(userId: string): Promise<string> {
    const sub = await this.subscriptions.findOne({
      where: { userId, status: 'ACTIVE' },
    });

    return sub?.planId ?? 'free';
  }

  private async resolveMaxValue(
    key: string,
    planId: string,
    period: LimitPeriod,
  ): Promise<number> {
    const param = await this.parameters.findOne({ where: { key } });
    if (!param) {
      throw new BadRequestException(`Parameter ${key} not found`);
    }

    const def = param.defaultValue as Record<string, unknown> | null;

    if (param.category === 'limited-user-var' && def && 'periods' in def) {
      const periods = def.periods as Array<{ period: string; max_value: number }>;
      const match = periods.find((p) => p.period === period);
      return match?.max_value ?? 0;
    }

    throw new BadRequestException(
      `Cannot resolve max value for ${key} (category=${param.category})`,
    );
  }

  private async logUsage(entry: {
    paramKey: string;
    planId: string;
    userId: string;
    period: string;
    delta: number;
    remainingAfter: number;
    source: string;
    meta?: unknown;
  }): Promise<void> {
    const log = this.usageLogs.create({
      id: crypto.randomUUID(),
      ...entry,
    });
    await this.usageLogs.save(log);
  }
}
