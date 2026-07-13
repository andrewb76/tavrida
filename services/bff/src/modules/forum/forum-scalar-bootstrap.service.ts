import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ScalarConfigClient } from '../scalar-config/scalar-config.client';
import { FORUM_SCALAR_REGISTRY } from './forum-scalar-variables.registry';

const SYNC_MAX_ATTEMPTS = 10;
const SYNC_RETRY_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class ForumScalarBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ForumScalarBootstrapService.name);

  constructor(private readonly scalarConfig: ScalarConfigClient) {}

  async onModuleInit() {
    for (let attempt = 1; attempt <= SYNC_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.scalarConfig.sync({
          service: 'forum',
          keys: FORUM_SCALAR_REGISTRY,
        });
        this.logger.log(
          `Forum scalar sync: ${result.synced} active keys` +
            (result.stale.length ? `, stale: ${result.stale.join(', ')}` : ''),
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === SYNC_MAX_ATTEMPTS) {
          this.logger.warn(`Forum scalar sync skipped after ${attempt} attempts: ${message}`);
          return;
        }
        this.logger.warn(
          `Forum scalar sync attempt ${attempt}/${SYNC_MAX_ATTEMPTS} failed: ${message}`,
        );
        await sleep(SYNC_RETRY_MS);
      }
    }
  }
}
