import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../../entities/user-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profiles: Repository<UserProfileEntity>,
  ) {}

  async list(input: { offset?: number; limit?: number; q?: string }) {
    const offset = Math.max(input.offset ?? 0, 0);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

    const qb = this.profiles
      .createQueryBuilder('profile')
      .orderBy('profile.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (input.q?.trim()) {
      const q = `%${input.q.trim()}%`;
      qb.andWhere('(profile.userId ILIKE :q OR profile.displayName ILIKE :q)', { q });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        inviterId: row.inviterId,
        invitationAcceptedAt: row.invitationAcceptedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: { offset, limit, total },
    };
  }

  async getById(userId: string) {
    const row = await this.profiles.findOne({ where: { userId } });
    if (!row) return null;

    return {
      userId: row.userId,
      displayName: row.displayName,
      inviterId: row.inviterId,
      invitationAcceptedAt: row.invitationAcceptedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async ensure(userId: string) {
    let row = await this.profiles.findOne({ where: { userId } });
    if (!row) {
      row = this.profiles.create({
        userId,
        inviterId: null,
        invitationAcceptedAt: null,
        displayName: null,
      });
      row = await this.profiles.save(row);
    }

    return {
      userId: row.userId,
      displayName: row.displayName,
      createdAt: row.createdAt.toISOString(),
      ensured: true,
    };
  }
}
