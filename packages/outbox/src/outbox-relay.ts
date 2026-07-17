import { randomUUID } from 'node:crypto';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
} from 'amqplib';
import { DataSource } from 'typeorm';
import { retryDelayMs } from './enqueue';
import { OutboxMessageEntity } from './outbox-message.entity';
import type { OutboxLogger } from './types';

const DEFAULT_EXCHANGE = 'tavrida-lot.events';

export type OutboxRelayOptions = {
  rabbitmqUrl?: string;
  logger: OutboxLogger;
  exchange?: string;
  pollIntervalMs?: number;
  leaseMs?: number;
  batchSize?: number;
  workerId?: string;
};

export class OutboxRelay {
  private readonly exchange: string;
  private readonly pollIntervalMs: number;
  private readonly leaseMs: number;
  private readonly batchSize: number;
  private readonly workerId: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly options: OutboxRelayOptions,
  ) {
    this.exchange = options.exchange ?? DEFAULT_EXCHANGE;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.leaseMs = options.leaseMs ?? 30_000;
    this.batchSize = options.batchSize ?? 25;
    this.workerId = options.workerId ?? randomUUID();
  }

  start(): void {
    if (this.timer || !this.options.rabbitmqUrl?.trim()) {
      if (!this.options.rabbitmqUrl?.trim()) {
        this.options.logger.warn('RABBITMQ_URL not set — outbox delivery paused');
      }
      return;
    }
    void this.flush();
    this.timer = setInterval(() => void this.flush(), this.pollIntervalMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Connection may already be closed.
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }

  async flush(): Promise<number> {
    if (this.flushing || !this.options.rabbitmqUrl?.trim()) return 0;
    this.flushing = true;
    try {
      const rows = await this.claimBatch();
      let published = 0;
      for (const row of rows) {
        try {
          await this.publish(row);
          await this.markPublished(row.eventId);
          published += 1;
        } catch (error) {
          await this.markFailed(row, error);
          this.resetConnection();
        }
      }
      return published;
    } finally {
      this.flushing = false;
    }
  }

  private claimBatch(): Promise<OutboxMessageEntity[]> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + this.leaseMs);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OutboxMessageEntity);
      const rows = await repository
        .createQueryBuilder('outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.published_at IS NULL')
        .andWhere('outbox.available_at <= :now', { now })
        .andWhere('(outbox.locked_until IS NULL OR outbox.locked_until <= :now)', { now })
        .orderBy('outbox.occurred_at', 'ASC')
        .take(this.batchSize)
        .getMany();
      for (const row of rows) {
        row.lockedBy = this.workerId;
        row.lockedUntil = lockedUntil;
      }
      return repository.save(rows);
    });
  }

  private async publish(row: OutboxMessageEntity): Promise<void> {
    const channel = await this.ensureChannel();
    const accepted = channel.publish(
      this.exchange,
      row.eventType,
      Buffer.from(JSON.stringify(row.envelope)),
      {
        contentType: 'application/json',
        messageId: row.eventId,
        type: row.eventType,
        persistent: true,
      },
    );
    if (!accepted) {
      await new Promise<void>((resolve) => channel.once('drain', resolve));
    }
    await channel.waitForConfirms();
  }

  private async ensureChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    const connection = await amqp.connect(this.options.rabbitmqUrl!.trim());
    const channel = await connection.createConfirmChannel();
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    const reset = () => this.resetConnection();
    connection.on('close', reset);
    connection.on('error', reset);
    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  private async markPublished(eventId: string): Promise<void> {
    await this.dataSource.getRepository(OutboxMessageEntity).update(
      { eventId, lockedBy: this.workerId },
      {
        publishedAt: new Date(),
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
      },
    );
    this.options.logger.log(`Published outbox event ${eventId}`);
  }

  private async markFailed(row: OutboxMessageEntity, error: unknown): Promise<void> {
    const attemptCount = row.attemptCount + 1;
    const detail = error instanceof Error ? error.message : String(error);
    await this.dataSource.getRepository(OutboxMessageEntity).update(
      { eventId: row.eventId, lockedBy: this.workerId },
      {
        attemptCount,
        availableAt: new Date(Date.now() + retryDelayMs(attemptCount)),
        lockedBy: null,
        lockedUntil: null,
        lastError: detail.slice(0, 4_000),
      },
    );
    this.options.logger.warn(
      `Outbox publish failed ${row.eventType} ${row.eventId} (attempt ${attemptCount}): ${detail}`,
    );
  }

  private resetConnection(): void {
    this.channel = null;
    this.connection = null;
  }
}
