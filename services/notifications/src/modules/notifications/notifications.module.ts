import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogEntity } from '../../entities/notification-log.entity';
import { SubscriberEntity } from '../../entities/subscriber.entity';
import { InternalNotificationsController } from './internal-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NovuAdapter } from './novu.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriberEntity, NotificationLogEntity])],
  controllers: [InternalNotificationsController],
  providers: [NotificationsService, NovuAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
