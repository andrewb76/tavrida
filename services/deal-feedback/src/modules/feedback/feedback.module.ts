import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealFeedbackEntity } from '../../entities/deal-feedback.entity';
import { PendingDealFeedbackEntity } from '../../entities/pending-deal-feedback.entity';
import { ProcessedEventEntity } from '../../entities/processed-event.entity';
import { DealFeedbackEventsConsumer } from '../events/deal-feedback-events.consumer';
import { FeedbackService } from './feedback.service';
import { InternalFeedbackController } from './internal-feedback.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DealFeedbackEntity,
      PendingDealFeedbackEntity,
      ProcessedEventEntity,
    ]),
  ],
  controllers: [InternalFeedbackController],
  providers: [FeedbackService, DealFeedbackEventsConsumer],
})
export class FeedbackModule {}
