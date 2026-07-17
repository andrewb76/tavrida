import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  enqueueDomainEvent,
  OutboxRelay,
} from '@tavrida/outbox';
import { DataSource, type EntityManager } from 'typeorm';
import type { InvitationRedeemedPayload } from '../../common/domain-events';

@Injectable()
export class InviteEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InviteEventsPublisher.name);
  private readonly relay: OutboxRelay;

  constructor(config: ConfigService, dataSource: DataSource) {
    this.relay = new OutboxRelay(dataSource, {
      rabbitmqUrl: config.get<string>('RABBITMQ_URL'),
      logger: this.logger,
    });
  }

  onModuleInit(): void {
    this.relay.start();
  }

  onModuleDestroy(): Promise<void> {
    return this.relay.stop();
  }

  flush(): void {
    void this.relay.flush();
  }

  enqueueInvitationRedeemed(
    manager: EntityManager,
    payload: InvitationRedeemedPayload,
  ) {
    return enqueueDomainEvent(manager, {
      eventType: 'invitation.redeemed',
      producer: 'user-profile',
      payload,
      correlationId: payload.inviteeId,
    });
  }
}
