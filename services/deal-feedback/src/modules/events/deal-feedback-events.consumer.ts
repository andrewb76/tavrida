import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { FeedbackService } from '../feedback/feedback.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'deal-feedback.events';
const ROUTING_KEYS = ['marketplace.order_completed', 'auction.completed'] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class DealFeedbackEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DealFeedbackEventsConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly feedback: FeedbackService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — deal-feedback consumer disabled');
      return;
    }
    try {
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      await ch.assertQueue(QUEUE, { durable: true });
      for (const key of ROUTING_KEYS) {
        await ch.bindQueue(QUEUE, EXCHANGE, key);
      }
      await ch.prefetch(10);
      await ch.consume(QUEUE, (msg) => {
        void this.onMessage(msg);
      });
      this.conn = conn;
      this.channel = ch;
      this.logger.log(`Consuming ${QUEUE} ← ${ROUTING_KEYS.join(', ')}`);
    } catch (err) {
      this.logger.warn(`RabbitMQ consumer failed to start: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.conn?.close();
    } catch {
      /* ignore */
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) return;
    try {
      const envelope = JSON.parse(msg.content.toString('utf8')) as Envelope;
      if (envelope.eventType === 'marketplace.order_completed') {
        const p = envelope.payload as {
          orderId?: string;
          providerId?: string;
          customerId?: string;
        };
        if (p.orderId && p.providerId && p.customerId) {
          await this.feedback.handleOrderCompleted(envelope.eventId, {
            orderId: p.orderId,
            providerId: p.providerId,
            customerId: p.customerId,
          });
        }
      }
      // auction.completed — bind ready; handler when auction payload wired
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Failed to process message: ${String(err)}`);
      this.channel.nack(msg, false, false);
    }
  }
}
