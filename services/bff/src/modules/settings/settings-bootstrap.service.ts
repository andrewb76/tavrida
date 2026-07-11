import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BFF_CLUB_SETTINGS_REGISTRY } from './bff-settings.registry';
import { SettingsClient } from './settings.client';

const REGISTER_MAX_ATTEMPTS = 10;
const REGISTER_RETRY_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class SettingsBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SettingsBootstrapService.name);

  constructor(private readonly client: SettingsClient) {}

  async onModuleInit() {
    for (let attempt = 1; attempt <= REGISTER_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.client.register(BFF_CLUB_SETTINGS_REGISTRY);
        this.logger.log(`Registered ${result.registered} BFF club settings keys`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === REGISTER_MAX_ATTEMPTS) {
          this.logger.warn(`Settings register skipped after ${attempt} attempts: ${message}`);
          return;
        }
        this.logger.warn(
          `Settings register attempt ${attempt}/${REGISTER_MAX_ATTEMPTS} failed: ${message}`,
        );
        await sleep(REGISTER_RETRY_MS);
      }
    }
  }
}
