import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import type { RegisterParameterDto, SyncParametersDto } from './dto/parameters.dto';

@Injectable()
export class ParameterService {
  constructor(
    @InjectRepository(ParameterEntity)
    private readonly parameters: Repository<ParameterEntity>,
    @InjectRepository(PlanValueEntity)
    private readonly planValues: Repository<PlanValueEntity>,
  ) {}

  async register(dto: RegisterParameterDto) {
    const existing = await this.parameters.findOne({ where: { key: dto.key } });

    if (existing) {
      existing.service = dto.service;
      existing.category = dto.category;
      existing.name = dto.name;
      existing.description = dto.description ?? '';
      existing.paramType = dto.paramType;
      existing.defaultValue = dto.defaultValue;
      existing.userOverride = dto.userOverride ?? false;
      existing.sortOrder = dto.sortOrder ?? 0;
      existing.syncStatus = 'active';
      await this.parameters.save(existing);
    } else {
      await this.parameters.save({
        key: dto.key,
        service: dto.service,
        category: dto.category,
        name: dto.name,
        description: dto.description ?? '',
        paramType: dto.paramType,
        defaultValue: dto.defaultValue,
        userOverride: dto.userOverride ?? false,
        sortOrder: dto.sortOrder ?? 0,
        syncStatus: 'active',
      });
    }

    if (dto.planValues) {
      await this.upsertPlanValues(dto.key, dto.planValues);
    }

    return { key: dto.key, registered: true };
  }

  async sync(dto: SyncParametersDto) {
    const syncedKeys: string[] = [];

    for (const param of dto.parameters) {
      await this.register({ ...param, service: dto.service });
      syncedKeys.push(param.key);
    }

    const stale: string[] = [];
    const rows = await this.parameters.find({ where: { service: dto.service } });
    for (const row of rows) {
      if (syncedKeys.includes(row.key)) continue;
      if (row.syncStatus !== 'stale') {
        row.syncStatus = 'stale';
        await this.parameters.save(row);
      }
      stale.push(row.key);
    }

    return { service: dto.service, synced: syncedKeys.length, stale };
  }

  async list(service?: string, category?: string) {
    const where: Record<string, string> = {};
    if (service) where.service = service;
    if (category) where.category = category;

    const rows = await this.parameters.find({
      where,
      order: { sortOrder: 'ASC', key: 'ASC' },
    });

    return { data: rows };
  }

  async findOne(key: string) {
    const row = await this.parameters.findOne({ where: { key } });
    if (!row) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Parameter ${key} not found`,
      });
    }
    return row;
  }

  async remove(key: string) {
    const meta = await this.parameters.findOne({ where: { key } });
    if (!meta) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Parameter ${key} not found`,
      });
    }

    await this.planValues.delete({ paramKey: key });
    await this.parameters.delete({ key });
    return { key, deleted: true };
  }

  private async upsertPlanValues(paramKey: string, planValues: Record<string, unknown>) {
    for (const [planId, value] of Object.entries(planValues)) {
      await this.planValues.save({ planId, paramKey, value });
    }
  }
}
