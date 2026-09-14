import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionRenewService {
  private readonly logger = new Logger(SubscriptionRenewService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Cron('0 * * * *')
  async handleRenewal() {
    this.logger.debug('Running scheduled subscription renewal');
    const result = await this.subscriptionService.renewDue();
    this.logger.log(
      `Scheduled renewal completed: scanned=${result.scanned} renewed=${result.renewed} expired=${result.expired}`,
    );
  }
}
