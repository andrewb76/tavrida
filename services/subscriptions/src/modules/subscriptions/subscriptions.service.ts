import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  isDigestDue,
  resolveMatchQuery,
  TARGET_LIMIT_KEYS,
  type DigestFrequency,
  type QuietHours,
  type SourceDomain,
  type TargetType,
} from '../../common/subscription.types';
import { DeliveryPreferenceEntity } from '../../entities/delivery-preference.entity';
import { SubscriptionEntity } from '../../entities/subscription.entity';

export type CreateSubscriptionInput = {
  userId: string;
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId?: string | null;
  options?: Record<string, unknown>;
};

export type DeliveryPreferenceDto = {
  userId: string;
  emailDigestEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: DigestFrequency;
  quietHours: QuietHours | null;
  updatedAt: string | null;
};

export type UpdateDeliveryPreferenceInput = {
  userId: string;
  emailDigestEnabled?: boolean;
  pushEnabled?: boolean;
  digestFrequency?: DigestFrequency;
  quietHours?: QuietHours | null;
};

const DEFAULT_DELIVERY = {
  emailDigestEnabled: false,
  pushEnabled: true,
  digestFrequency: 'DAILY' as DigestFrequency,
  quietHours: null as QuietHours | null,
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repo: Repository<SubscriptionEntity>,
    @InjectRepository(DeliveryPreferenceEntity)
    private readonly deliveryRepo: Repository<DeliveryPreferenceEntity>,
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

  async match(eventType: string, payload: Record<string, unknown>): Promise<{ userIds: string[] }> {
    const query = resolveMatchQuery(eventType, payload);
    if (!query) {
      return { userIds: [] };
    }

    const rows = await this.repo.find({
      where: {
        sourceDomain: query.sourceDomain,
        targetType: query.targetType,
        targetId: query.targetId,
      },
      select: ['userId'],
    });

    const userIds = [...new Set(rows.map((row) => row.userId))];
    return { userIds };
  }

  toDeliveryDto(userId: string, row?: DeliveryPreferenceEntity | null): DeliveryPreferenceDto {
    if (!row) {
      return {
        userId,
        ...DEFAULT_DELIVERY,
        updatedAt: null,
      };
    }
    return {
      userId: row.userId,
      emailDigestEnabled: row.emailDigestEnabled,
      pushEnabled: row.pushEnabled,
      digestFrequency: row.digestFrequency,
      quietHours: row.quietHours,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getDeliveryPreference(userId: string): Promise<DeliveryPreferenceDto> {
    const row = await this.deliveryRepo.findOne({ where: { userId } });
    return this.toDeliveryDto(userId, row);
  }

  async upsertDeliveryPreference(
    input: UpdateDeliveryPreferenceInput,
  ): Promise<DeliveryPreferenceDto> {
    let row = await this.deliveryRepo.findOne({ where: { userId: input.userId } });
    if (!row) {
      row = this.deliveryRepo.create({
        userId: input.userId,
        ...DEFAULT_DELIVERY,
      });
    }

    if (input.emailDigestEnabled !== undefined) {
      row.emailDigestEnabled = input.emailDigestEnabled;
    }
    if (input.pushEnabled !== undefined) {
      row.pushEnabled = input.pushEnabled;
    }
    if (input.digestFrequency !== undefined) {
      row.digestFrequency = input.digestFrequency;
    }
    if (input.quietHours !== undefined) {
      row.quietHours = input.quietHours;
    }

    const saved = await this.deliveryRepo.save(row);
    return this.toDeliveryDto(input.userId, saved);
  }

  /**
   * External CRON calls this. Notifications service is not implemented yet —
   * returns due users without triggering delivery.
   */
  async runDigest(now: Date = new Date()): Promise<{
    dueUserIds: string[];
    triggered: number;
    skipped: number;
  }> {
    const rows = await this.deliveryRepo.find({
      where: { emailDigestEnabled: true },
    });

    const dueUserIds: string[] = [];
    let skipped = 0;
    for (const row of rows) {
      if (!isDigestDue(row.digestFrequency, now)) {
        skipped += 1;
        continue;
      }
      dueUserIds.push(row.userId);
    }

    return { dueUserIds, triggered: 0, skipped };
  }
}
