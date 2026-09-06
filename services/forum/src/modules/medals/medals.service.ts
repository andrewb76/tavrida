import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { MedalEntity } from '../../entities/medal.entity';
import { UserMedalEntity } from '../../entities/user-medal.entity';

export type MedalDto = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  dispPosition: number;
};

export type UserMedalDto = {
  medalId: string;
  medalName: string;
  medalIconUrl: string | null;
  awardedAt: string;
  awardedBy: string | null;
  reason: string | null;
};

@Injectable()
export class MedalsService {
  constructor(
    @InjectRepository(MedalEntity)
    private readonly medals: Repository<MedalEntity>,
    @InjectRepository(UserMedalEntity)
    private readonly userMedals: Repository<UserMedalEntity>,
  ) {}

  async listAll(): Promise<MedalDto[]> {
    const rows = await this.medals.find({ order: { dispPosition: 'ASC', name: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      iconUrl: r.iconUrl,
      dispPosition: r.dispPosition,
    }));
  }

  async listUserMedals(userId: string): Promise<UserMedalDto[]> {
    const rows = await this.userMedals.find({
      where: { userId, revokedAt: undefined as never },
      order: { awardedAt: 'DESC' },
    });

    if (rows.length === 0) return [];

    const medalIds = [...new Set(rows.map((r) => r.medalId))];
    const medalRows = await this.medals.findBy({ id: In(medalIds) });
    const medalMap = new Map(medalRows.map((m) => [m.id, m]));

    return rows.map((r) => {
      const medal = medalMap.get(r.medalId);
      return {
        medalId: r.medalId,
        medalName: medal?.name ?? 'Unknown',
        medalIconUrl: medal?.iconUrl ?? null,
        awardedAt: r.awardedAt.toISOString(),
        awardedBy: r.awardedBy,
        reason: r.reason,
      };
    });
  }

  async award(input: {
    userId: string;
    medalId: string;
    awardedBy?: string;
    reason?: string;
  }): Promise<UserMedalDto> {
    const medal = await this.medals.findOne({ where: { id: input.medalId } });
    if (!medal) {
      throw new NotFoundException({ type: 'not-found', detail: `Medal ${input.medalId} not found` });
    }

    const existing = await this.userMedals.findOne({
      where: { userId: input.userId, medalId: input.medalId },
    });

    if (existing && !existing.revokedAt) {
      return {
        medalId: existing.medalId,
        medalName: medal.name,
        medalIconUrl: medal.iconUrl,
        awardedAt: existing.awardedAt.toISOString(),
        awardedBy: existing.awardedBy,
        reason: existing.reason,
      };
    }

    if (existing && existing.revokedAt) {
      existing.revokedAt = null;
      existing.awardedBy = input.awardedBy ?? null;
      existing.reason = input.reason ?? null;
      await this.userMedals.save(existing);
      return {
        medalId: existing.medalId,
        medalName: medal.name,
        medalIconUrl: medal.iconUrl,
        awardedAt: existing.awardedAt.toISOString(),
        awardedBy: existing.awardedBy,
        reason: existing.reason,
      };
    }

    const row = this.userMedals.create({
      userId: input.userId,
      medalId: input.medalId,
      awardedBy: input.awardedBy ?? null,
      reason: input.reason ?? null,
    });
    await this.userMedals.save(row);
    return {
      medalId: row.medalId,
      medalName: medal.name,
      medalIconUrl: medal.iconUrl,
      awardedAt: row.awardedAt.toISOString(),
      awardedBy: row.awardedBy,
      reason: row.reason,
    };
  }

  async create(input: { name: string; description?: string; iconUrl?: string; dispPosition?: number }): Promise<MedalDto> {
    const row = this.medals.create({
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      iconUrl: input.iconUrl ?? null,
      dispPosition: input.dispPosition ?? 0,
    });
    await this.medals.save(row);
    return { id: row.id, name: row.name, description: row.description, iconUrl: row.iconUrl, dispPosition: row.dispPosition };
  }

  async update(id: string, input: { name?: string; description?: string; iconUrl?: string; dispPosition?: number }): Promise<MedalDto> {
    const row = await this.medals.findOne({ where: { id } });
    if (!row) throw new NotFoundException({ type: 'not-found', detail: `Medal ${id} not found` });
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description;
    if (input.iconUrl !== undefined) row.iconUrl = input.iconUrl;
    if (input.dispPosition !== undefined) row.dispPosition = input.dispPosition;
    await this.medals.save(row);
    return { id: row.id, name: row.name, description: row.description, iconUrl: row.iconUrl, dispPosition: row.dispPosition };
  }

  async remove(id: string): Promise<void> {
    const row = await this.medals.findOne({ where: { id } });
    if (!row) throw new NotFoundException({ type: 'not-found', detail: `Medal ${id} not found` });
    await this.userMedals.delete({ medalId: id });
    await this.medals.remove(row);
  }

  async revoke(userId: string, medalId: string): Promise<void> {
    const row = await this.userMedals.findOne({
      where: { userId, medalId },
    });
    if (!row || row.revokedAt) return;
    row.revokedAt = new Date();
    await this.userMedals.save(row);
  }
}
