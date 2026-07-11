import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../../entities/user-profile.entity';

export type LogtoUserSyncInput = {
  userId: string;
  name?: string | null;
  username?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profiles: Repository<UserProfileEntity>,
  ) {}

  private toDto(row: UserProfileEntity) {
    return {
      userId: row.userId,
      displayName: row.displayName,
      email: row.email,
      username: row.username,
      avatarUrl: row.avatarUrl,
      primaryPhone: row.primaryPhone,
      isSuspended: row.isSuspended,
      inviterId: row.inviterId,
      invitationAcceptedAt: row.invitationAcceptedAt?.toISOString() ?? null,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      logtoSyncedAt: row.logtoSyncedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(input: { offset?: number; limit?: number; q?: string; includeDeleted?: boolean }) {
    const offset = Math.max(input.offset ?? 0, 0);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

    const qb = this.profiles
      .createQueryBuilder('profile')
      .orderBy('profile.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (!input.includeDeleted) {
      qb.andWhere('profile.deletedAt IS NULL');
    }

    if (input.q?.trim()) {
      const q = `%${input.q.trim()}%`;
      qb.andWhere(
        '(profile.userId ILIKE :q OR profile.displayName ILIKE :q OR profile.email ILIKE :q OR profile.username ILIKE :q)',
        { q },
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => this.toDto(row)),
      pagination: { offset, limit, total },
    };
  }

  async getById(userId: string) {
    const row = await this.profiles.findOne({ where: { userId } });
    if (!row) return null;
    return this.toDto(row);
  }

  async ensure(userId: string) {
    let row = await this.profiles.findOne({ where: { userId } });
    if (!row) {
      row = this.profiles.create({
        userId,
        inviterId: null,
        invitationAcceptedAt: null,
        displayName: null,
        email: null,
        username: null,
        avatarUrl: null,
        primaryPhone: null,
        isSuspended: false,
        deletedAt: null,
        logtoSyncedAt: null,
      });
      row = await this.profiles.save(row);
    }

    return {
      userId: row.userId,
      displayName: row.displayName,
      ensured: true,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async syncFromLogto(input: LogtoUserSyncInput) {
    let row = await this.profiles.findOne({ where: { userId: input.userId } });
    const displayName = input.name?.trim() || input.username?.trim() || null;
    const now = new Date();

    if (!row) {
      row = this.profiles.create({
        userId: input.userId,
        displayName,
        email: input.primaryEmail ?? null,
        username: input.username ?? null,
        avatarUrl: input.avatar ?? null,
        primaryPhone: input.primaryPhone ?? null,
        isSuspended: input.isSuspended ?? false,
        inviterId: null,
        invitationAcceptedAt: null,
        deletedAt: null,
        logtoSyncedAt: now,
      });
    } else {
      if (displayName) row.displayName = displayName;
      if (input.primaryEmail !== undefined) row.email = input.primaryEmail;
      if (input.username !== undefined) row.username = input.username;
      if (input.avatar !== undefined) row.avatarUrl = input.avatar;
      if (input.primaryPhone !== undefined) row.primaryPhone = input.primaryPhone;
      if (input.isSuspended !== undefined) row.isSuspended = input.isSuspended;
      row.deletedAt = null;
      row.logtoSyncedAt = now;
    }

    await this.profiles.save(row);
    return { ...this.toDto(row), synced: true };
  }

  async markDeleted(userId: string) {
    const row = await this.profiles.findOne({ where: { userId } });
    if (!row) {
      return { userId, deleted: false };
    }

    row.deletedAt = new Date();
    await this.profiles.save(row);
    return { userId, deleted: true, deletedAt: row.deletedAt.toISOString() };
  }
}
