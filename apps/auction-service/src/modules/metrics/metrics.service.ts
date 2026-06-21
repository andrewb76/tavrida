import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // --- HTTP метрики ---
  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly httpRequestsTotal: client.Counter<string>;

  // --- Бизнес метрики ---
  public readonly auctionCreationsTotal: client.Counter<string>;
  public readonly auctionBidsTotal: client.Counter<string>;
  public readonly auctionAutobidsTotal: client.Counter<string>;
  public readonly auctionFinishedTotal: client.Counter<string>;
  public readonly auctionActiveCount: client.Gauge<string>;
  public readonly auctionPriceDropsTotal: client.Counter<string>;
  public readonly auctionSaleAmountTotal: client.Counter<string>;

  // --- Технические метрики ---
  public readonly dbQueryDuration: client.Histogram<string>;
  public readonly queueSize: client.Gauge<string>;
  public readonly queueFailedTotal: client.Counter<string>;

  constructor(
    @InjectQueue('auction-tasks') private auctionQueue: Queue,
    @InjectQueue('autobid-tasks') private autobidQueue: Queue,
  ) {
    // Инициализация метрик
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.auctionCreationsTotal = new client.Counter({
      name: 'auction_creations_total',
      help: 'Total number of auctions created',
      labelNames: ['type'],
    });

    this.auctionBidsTotal = new client.Counter({
      name: 'auction_bids_total',
      help: 'Total number of bids placed',
    });

    this.auctionAutobidsTotal = new client.Counter({
      name: 'auction_autobids_total',
      help: 'Total number of autobids placed',
    });

    this.auctionFinishedTotal = new client.Counter({
      name: 'auction_finished_total',
      help: 'Total number of finished auctions',
      labelNames: ['result'], // sold, unsold, buynow
    });

    this.auctionActiveCount = new client.Gauge({
      name: 'auction_active_count',
      help: 'Number of currently active auctions',
    });

    this.auctionPriceDropsTotal = new client.Counter({
      name: 'auction_price_drops_total',
      help: 'Total number of price drops in Dutch auctions',
    });

    this.auctionSaleAmountTotal = new client.Counter({
      name: 'auction_sale_amount_total',
      help: 'Total sale amount in currency units',
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });

    this.queueSize = new client.Gauge({
      name: 'queue_size',
      help: 'Size of BullMQ queue',
      labelNames: ['queue_name'],
    });

    this.queueFailedTotal = new client.Counter({
      name: 'queue_failed_total',
      help: 'Total number of failed jobs in BullMQ',
      labelNames: ['queue_name'],
    });
  }

  async onModuleInit() {
    // Устанавливаем дефолтные лейблы
    client.register.setDefaultLabels({ app: 'auction-service' });
    // Включаем сбор стандартных метрик Node.js
    client.collectDefaultMetrics({ register: client.register });

    // Запускаем периодический сбор метрик очередей
    setInterval(() => this.collectQueueMetrics(), 15000);
  }

  private async collectQueueMetrics() {
    try {
      const auctionCounts = await this.auctionQueue.getJobCounts();
      const autobidCounts = await this.autobidQueue.getJobCounts();

      this.queueSize.set({ queue_name: 'auction-tasks' }, auctionCounts.waiting + auctionCounts.active + auctionCounts.delayed);
      this.queueSize.set({ queue_name: 'autobid-tasks' }, autobidCounts.waiting + autobidCounts.active + autobidCounts.delayed);
    } catch (error) {
      this.logger.warn(`Failed to collect queue metrics: ${error.message}`);
    }
  }

  // Метод для получения всех метрик в формате Prometheus
  async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  // Метод для инкремента создания аукционов
  incrementAuctionCreation(type: string) {
    this.auctionCreationsTotal.inc({ type });
  }

  // Метод для инкремента ставок
  incrementBid(isAutobid: boolean = false) {
    this.auctionBidsTotal.inc();
    if (isAutobid) {
      this.auctionAutobidsTotal.inc();
    }
  }

  // Метод для завершения аукциона
  incrementAuctionFinished(result: 'sold' | 'unsold' | 'buynow', amount: number) {
    this.auctionFinishedTotal.inc({ result });
    if (result !== 'unsold') {
      this.auctionSaleAmountTotal.inc(amount);
    }
  }

  // Метод для изменения активных аукционов
  setActiveAuctions(count: number) {
    this.auctionActiveCount.set(count);
  }

  // Метод для инкремента снижения цены голландского аукциона
  incrementPriceDrop() {
    this.auctionPriceDropsTotal.inc();
  }
}
