import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BFF_CLUB_SCALAR_REGISTRY } from './bff-scalar-variables.registry';
import { ScalarConfigClient } from './scalar-config.client';

const SYNC_MAX_ATTEMPTS = 10;
const SYNC_RETRY_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class ScalarConfigBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ScalarConfigBootstrapService.name);

  constructor(private readonly client: ScalarConfigClient) {}

  async onModuleInit() {
    for (let attempt = 1; attempt <= SYNC_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.client.sync({
          service: 'bff',
          keys: BFF_CLUB_SCALAR_REGISTRY,
        });
        this.logger.log(
          `Scalar config sync: ${result.synced} active keys` +
            (result.stale.length ? `, stale: ${result.stale.join(', ')}` : ''),
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === SYNC_MAX_ATTEMPTS) {
          this.logger.warn(`Scalar config sync skipped after ${attempt} attempts: ${message}`);
          return;
        }
        this.logger.warn(
          `Scalar config sync attempt ${attempt}/${SYNC_MAX_ATTEMPTS} failed: ${message}`,
        );
        await sleep(SYNC_RETRY_MS);
      }
    }
  }
}
