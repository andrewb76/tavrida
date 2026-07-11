import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { SettingEntity } from '../../entities/setting.entity';
import { SettingKeyEntity } from '../../entities/setting-key.entity';
import type { RegisterSettingKeyDto } from './dto/settings.dto';

const PUBLIC_KEYS = new Set([
  'club.registration.inviteOnly',
  'club.landing.publicSections',
]);

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settings: Repository<SettingEntity>,
    @InjectRepository(SettingKeyEntity)
    private readonly keys: Repository<SettingKeyEntity>,
  ) {}

  async register(keys: RegisterSettingKeyDto[]) {
    for (const item of keys) {
      await this.keys.save({
        key: item.key,
        type: item.type,
        defaultValue: item.default,
        service: item.service,
        description: item.description ?? null,
      });

      const existing = await this.settings.findOne({ where: { key: item.key } });
      if (!existing) {
        await this.settings.save({
          key: item.key,
          value: item.default,
          scope: 'global',
          updatedBy: null,
        });
      }
    }

    return { registered: keys.length };
  }

  async getDomain(domain: string): Promise<Record<string, unknown>> {
    const prefix = `${domain}.`;
    const rows = await this.settings.find({
      where: { key: Like(`${prefix}%`) },
      order: { key: 'ASC' },
    });

    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.key.slice(prefix.length)] = row.value;
    }
    return out;
  }

  async getPublic(): Promise<Record<string, unknown>> {
    const rows = await this.settings.find({
      where: Array.from(PUBLIC_KEYS).map((key) => ({ key })),
    });
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.key] = row.value;
    }
    return out;
  }

  async patchDomain(
    domain: string,
    patch: Record<string, unknown>,
    updatedBy?: string,
  ): Promise<Record<string, unknown>> {
    const prefix = `${domain}.`;

    for (const [shortKey, value] of Object.entries(patch)) {
      const fullKey = `${prefix}${shortKey}`;
      const meta = await this.keys.findOne({ where: { key: fullKey } });
      if (!meta) {
        throw new BadRequestException({
          type: 'validation-error',
          detail: `Unknown setting key: ${fullKey}`,
        });
      }

      await this.settings.save({
        key: fullKey,
        value,
        scope: 'global',
        updatedBy: updatedBy ?? null,
      });
    }

    return this.getDomain(domain);
  }
}
