import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';

const PUBLIC_KEYS = new Set([
  'club.registration.inviteOnly',
  'club.landing.publicSections',
  'auction.lot.image.aspectWidth',
  'auction.lot.image.aspectHeight',
]);

@Injectable()
export class SystemValueService {
  constructor(
    @InjectRepository(SystemValueEntity)
    private readonly values: Repository<SystemValueEntity>,
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
  ) {}

  async getDomain(domain: string): Promise<Record<string, unknown>> {
    const prefix = `${domain}.`;
    const rows = await this.values.find({
      where: { paramKey: Like(`${prefix}%`) },
      order: { paramKey: 'ASC' },
    });

    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.paramKey.slice(prefix.length)] = row.value;
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
      const param = await this.parameters.findOne({ where: { key: fullKey } });
      if (!param) {
        throw new NotFoundException({
          type: 'not-found',
          detail: `Unknown parameter: ${fullKey}`,
        });
      }

      await this.values.save({
        paramKey: fullKey,
        value,
        updatedBy: updatedBy ?? null,
      });
    }

    return this.getDomain(domain);
  }

  async getPublic(): Promise<Record<string, unknown>> {
    const rows = await this.values.find({
      where: Array.from(PUBLIC_KEYS).map((paramKey) => ({ paramKey })),
    });
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.paramKey] = row.value;
    }
    return out;
  }

  async getOne(key: string): Promise<SystemValueEntity> {
    const row = await this.values.findOne({ where: { paramKey: key } });
    if (!row) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `System value ${key} not found`,
      });
    }
    return row;
  }

  async upsert(
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<SystemValueEntity> {
    const existing = await this.values.findOne({ where: { paramKey: key } });

    if (existing) {
      existing.value = value;
      existing.updatedBy = updatedBy ?? null;
      return this.values.save(existing);
    }

    return this.values.save({
      paramKey: key,
      value,
      updatedBy: updatedBy ?? null,
    });
  }
}
