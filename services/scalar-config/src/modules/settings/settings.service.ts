import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ScalarValueEntity } from '../../entities/scalar-value.entity';
import { ScalarVariableEntity } from '../../entities/scalar-variable.entity';
import type { RegisterScalarVariableDto } from './dto/settings.dto';

const PUBLIC_KEYS = new Set([
  'club.registration.inviteOnly',
  'club.landing.publicSections',
]);

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ScalarValueEntity)
    private readonly values: Repository<ScalarValueEntity>,
    @InjectRepository(ScalarVariableEntity)
    private readonly variables: Repository<ScalarVariableEntity>,
  ) {}

  async register(keys: RegisterScalarVariableDto[]) {
    for (const item of keys) {
      await this.upsertVariable(item, 'active');
    }
    return { registered: keys.length };
  }

  /**
   * Полный манифест ключей сервиса при старте.
   * Отсутствующие в списке ключи того же service → `stale` (без автоудаления).
   */
  async sync(input: { service: string; keys: RegisterScalarVariableDto[] }) {
    const syncedKeys: string[] = [];

    for (const item of input.keys) {
      await this.upsertVariable({ ...item, service: input.service }, 'active');
      syncedKeys.push(item.key);
    }

    const stale: string[] = [];
    const rows = await this.variables.find({ where: { service: input.service } });
    for (const row of rows) {
      if (syncedKeys.includes(row.key)) continue;
      if (row.syncStatus !== 'stale') {
        row.syncStatus = 'stale';
        await this.variables.save(row);
      }
      stale.push(row.key);
    }

    return { service: input.service, synced: syncedKeys.length, stale };
  }

  async listRegistry() {
    const rows = await this.variables.find({ order: { key: 'ASC' } });
    const values = await this.values.find();
    const valueByKey = new Map(values.map((row) => [row.key, row.value]));

    return {
      data: rows.map((row) => ({
        key: row.key,
        service: row.service,
        type: row.type,
        description: row.description,
        syncStatus: row.syncStatus,
        defaultValue: row.defaultValue,
        value: valueByKey.get(row.key) ?? row.defaultValue,
      })),
    };
  }

  async deleteKey(key: string) {
    const meta = await this.variables.findOne({ where: { key } });
    if (!meta) {
      throw new NotFoundException({ type: 'not-found', detail: `Scalar variable ${key} not found` });
    }

    await this.values.delete({ key });
    await this.variables.delete({ key });
    return { key, deleted: true };
  }

  private async upsertVariable(item: RegisterScalarVariableDto, syncStatus: 'active' | 'stale') {
    const existing = await this.variables.findOne({ where: { key: item.key } });
    if (existing) {
      existing.type = item.type;
      existing.defaultValue = item.default;
      existing.service = item.service;
      existing.description = item.description ?? null;
      existing.syncStatus = syncStatus;
      await this.variables.save(existing);
    } else {
      await this.variables.save({
        key: item.key,
        type: item.type,
        defaultValue: item.default,
        service: item.service,
        description: item.description ?? null,
        syncStatus,
      });
    }

    const valueRow = await this.values.findOne({ where: { key: item.key } });
    if (!valueRow) {
      await this.values.save({
        key: item.key,
        value: item.default,
        scope: 'global',
        updatedBy: null,
      });
    }
  }

  async getDomain(domain: string): Promise<Record<string, unknown>> {
    const prefix = `${domain}.`;
    const rows = await this.values.find({
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
    const rows = await this.values.find({
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
      const meta = await this.variables.findOne({ where: { key: fullKey } });
      if (!meta) {
        throw new BadRequestException({
          type: 'validation-error',
          detail: `Unknown scalar variable: ${fullKey}`,
        });
      }

      await this.values.save({
        key: fullKey,
        value,
        scope: 'global',
        updatedBy: updatedBy ?? null,
      });
    }

    return this.getDomain(domain);
  }
}
