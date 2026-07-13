import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TARGET_LIMIT_KEYS, type SourceDomain, type TargetType } from '../../common/subscription.types';
import { SubscriptionEntity } from '../../entities/subscription.entity';

export type CreateSubscriptionInput = {
  userId: string;
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId?: string | null;
  options?: Record<string, unknown>;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repo: Repository<SubscriptionEntity>,
  ) {}

  list(userId: string, sourceDomain?: SourceDomain) {
    return this.repo.find({
      where: sourceDomain ? { userId, sourceDomain } : { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async countByTargetType(userId: string, targetType: TargetType): Promise<number> {
    return this.repo.count({ where: { userId, targetType } });
  }

  limitKeyFor(targetType: TargetType): string | null {
    return TARGET_LIMIT_KEYS[targetType];
  }

  async create(input: CreateSubscriptionInput): Promise<SubscriptionEntity> {
    const targetId = input.targetId ?? null;
    if (input.targetType !== 'DIGEST_GLOBAL' && !targetId) {
      throw new BadRequestException('targetId is required for this targetType');
    }

    const existing = await this.repo.findOne({
      where: {
        userId: input.userId,
        sourceDomain: input.sourceDomain,
        targetType: input.targetType,
        targetId: targetId === null ? IsNull() : targetId,
      },
    });
    if (existing) {
      throw new ConflictException('Subscription already exists');
    }

    const row = this.repo.create({
      userId: input.userId,
      sourceDomain: input.sourceDomain,
      targetType: input.targetType,
      targetId,
      options: input.options ?? {},
    });
    return this.repo.save(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Subscription not found');
    await this.repo.remove(row);
    return { ok: true };
  }
}
