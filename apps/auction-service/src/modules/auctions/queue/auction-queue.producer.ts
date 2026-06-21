import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuctionQueueProducer implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionQueueProducer.name);

  constructor(
    @InjectQueue('auction-tasks') 
    private readonly auctionQueue: Queue
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Инициализация распределенного планировщика в Redis...');

    // Регистрируем в Redis повторяемую задачу (Repeatable Job)
    // Она будет генерироваться каждую минуту. Если задача уже зарегистрирована, BullMQ просто обновит её
    await this.auctionQueue.add(
      'cron-tick', // Имя выполняемой задачи
      {},          // Пустые данные (нам нужен только сам факт триггера)
      {
        repeat: {
          pattern: '* * * * *', // Каждую минуту (стандартный синтаксис крона)
        },
        jobId: 'global-auction-cron-job', // Жесткий ID, чтобы инстансы не дублировали задачу
        removeOnComplete: true, // Чистим историю в Redis после выполнения
        removeOnFail: true,
      },
    );

    this.logger.log('Повторяемая задача для пересчета аукционов успешно добавлена в Redis.');
  }
}
