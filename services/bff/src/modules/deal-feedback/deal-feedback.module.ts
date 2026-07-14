import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealFeedbackClient } from './deal-feedback.client';
import { DealFeedbackController } from './deal-feedback.controller';

@Module({
  imports: [AuthModule],
  controllers: [DealFeedbackController],
  providers: [DealFeedbackClient],
  exports: [DealFeedbackClient],
})
export class DealFeedbackModule {}
