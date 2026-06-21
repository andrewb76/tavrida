import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AutobidQueueProducer {
  constructor(@InjectQueue('autobid-tasks') private readonly autobidQueue: Queue) {}

  async scheduleAutobidCheck(auctionId: string) {
    await this.autobidQueue.add('check-autobids', { auctionId });
  }
}
