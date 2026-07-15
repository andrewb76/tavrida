import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from '../../entities/notification-log.entity';
import { SubscriberEntity } from '../../entities/subscriber.entity';
import { NovuAdapter } from './novu.adapter';

/** Known workflows — see docs/03-architecture/notifications-analysis.md */
export const KNOWN_WORKFLOWS = new Set([
  'feedback-request',
  'feedback-reminder',
  'auction-bid',
  'auction-subscription-digest',
  'forum-reply',
  'tag-content',
  'forum-digest',
  'balance-charged',
  'subscription-activated',
  'subscription-expired',
  'rating-penalty',
  'forum-content-reported',
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(SubscriberEntity)
    private readonly subscribers: Repository<SubscriberEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly logs: Repository<NotificationLogEntity>,
    private readonly novu: NovuAdapter,
  ) {}

  async upsertSubscriber(input: {
    userId: string;
    email?: string | null;
    fcmToken?: string | null;
  }) {
    const userId = input.userId.trim();
    if (!userId) {
      throw new BadRequestException({ type: 'validation', detail: 'userId required' });
    }

    let row = await this.subscribers.findOne({ where: { userId } });
    if (!row) {
      row = this.subscribers.create({
        userId,
        email: input.email?.trim() || null,
        fcmToken: input.fcmToken?.trim() || null,
      });
    } else {
      if (input.email !== undefined) row.email = input.email?.trim() || null;
      if (input.fcmToken !== undefined) row.fcmToken = input.fcmToken?.trim() || null;
    }
    await this.subscribers.save(row);
    return {
      userId: row.userId,
      email: row.email,
      fcmToken: row.fcmToken,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async trigger(input: {
    userId: string;
    workflowId: string;
    payload?: Record<string, unknown>;
  }) {
    const userId = input.userId.trim();
    const workflowId = input.workflowId.trim();
    if (!userId || !workflowId) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'userId and workflowId required',
      });
    }
    if (!KNOWN_WORKFLOWS.has(workflowId)) {
      this.logger.warn(`unknown workflowId=${workflowId} — still attempting trigger`);
    }

    const subscriber = await this.ensureSubscriber(userId);

    let transactionId: string;
    let mode: 'novu' | 'mock';
    let status: NotificationLogEntity['status'] = 'pending';

    try {
      const result = await this.novu.trigger({
        workflowId,
        subscriberId: userId,
        payload: input.payload,
        email: subscriber.email,
      });
      transactionId = result.transactionId;
      mode = result.mode;
      status = mode === 'mock' ? 'sent' : 'pending';
    } catch (error) {
      transactionId = `failed-${randomUUID()}`;
      mode = this.novu.isConfigured() ? 'novu' : 'mock';
      status = 'failed';
      await this.logs.save(
        this.logs.create({
          id: randomUUID(),
          userId,
          workflowId,
          transactionId,
          channel: 'unknown',
          status,
          payload: {
            ...(input.payload ?? {}),
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
      throw new ServiceUnavailableException({
        type: 'upstream-error',
        detail: error instanceof Error ? error.message : 'Novu trigger failed',
      });
    }

    await this.logs.save(
      this.logs.create({
        id: randomUUID(),
        userId,
        workflowId,
        transactionId,
        channel: 'unknown',
        status,
        payload: input.payload ?? null,
      }),
    );

    return { transactionId, mode, status };
  }

  private async ensureSubscriber(userId: string): Promise<SubscriberEntity> {
    const existing = await this.subscribers.findOne({ where: { userId } });
    if (existing) return existing;
    const row = this.subscribers.create({
      userId,
      email: null,
      fcmToken: null,
    });
    return this.subscribers.save(row);
  }
}
