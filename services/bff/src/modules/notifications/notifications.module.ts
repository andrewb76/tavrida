import { Module } from '@nestjs/common';
import { NotificationsClient } from './notifications.client';

@Module({
  providers: [NotificationsClient],
  exports: [NotificationsClient],
})
export class NotificationsModule {}
