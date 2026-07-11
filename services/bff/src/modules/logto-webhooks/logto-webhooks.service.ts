import { Injectable, Logger } from '@nestjs/common';
import { UserProfileClient } from '../user-profile/user-profile.client';
import {
  extractLogtoUser,
  extractLogtoUserId,
  type LogtoWebhookPayload,
} from './logto-webhook.util';

const SYNC_EVENTS = new Set([
  'User.Created',
  'PostRegister',
  'User.Data.Updated',
  'User.SuspensionStatus.Updated',
]);

@Injectable()
export class LogtoWebhooksService {
  private readonly logger = new Logger(LogtoWebhooksService.name);

  constructor(private readonly profiles: UserProfileClient) {}

  async handle(payload: LogtoWebhookPayload) {
    const event = payload.event;

    if (event === 'User.Deleted') {
      const userId = extractLogtoUserId(payload);
      if (!userId) {
        this.logger.warn(`User.Deleted without userId (hook=${payload.hookId ?? 'n/a'})`);
        return { handled: false, event };
      }
      await this.profiles.markDeleted(userId);
      return { handled: true, event, userId, action: 'deleted' };
    }

    if (!SYNC_EVENTS.has(event)) {
      return { handled: false, event, action: 'ignored' };
    }

    const user = extractLogtoUser(payload);
    const userId = user?.id ?? extractLogtoUserId(payload);
    if (!userId) {
      this.logger.warn(`${event} without user entity (hook=${payload.hookId ?? 'n/a'})`);
      return { handled: false, event };
    }

    await this.profiles.syncFromLogto({
      userId,
      name: user?.name ?? null,
      username: user?.username ?? null,
      primaryEmail: user?.primaryEmail ?? null,
      primaryPhone: user?.primaryPhone ?? null,
      avatar: user?.avatar ?? null,
      isSuspended: user?.isSuspended,
    });

    return { handled: true, event, userId, action: 'synced' };
  }
}
