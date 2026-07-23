import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { AccessGroupMemberEntity } from '../../entities/access-group-member.entity';
import { AccessGroupEntity } from '../../entities/access-group.entity';
import { CategoryAccessGroupEntity } from '../../entities/category-access-group.entity';
import { CategoryEntity } from '../../entities/category.entity';

@Injectable()
export class AccessGroupsService {
  constructor(
    @InjectRepository(AccessGroupEntity)
    private readonly groups: Repository<AccessGroupEntity>,
    @InjectRepository(AccessGroupMemberEntity)
    private readonly members: Repository<AccessGroupMemberEntity>,
    @InjectRepository(CategoryAccessGroupEntity)
    private readonly categoryLinks: Repository<CategoryAccessGroupEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  async list() {
    const rows = await this.groups.find({ order: { name: 'ASC' } });
    const counts = await this.memberCounts(rows.map((r) => r.id));
    return {
      data: rows.map((row) => ({
        ...this.toRecord(row),
        memberCount: counts.get(row.id) ?? 0,
      })),
    };
  }

  async get(groupId: string) {
    const row = await this.requireGroup(groupId);
    const memberCount = await this.members.count({ where: { groupId } });
    return { ...this.toRecord(row), memberCount };
  }

  async create(input: { name: string; description?: string }) {
    const name = this.normalizeName(input.name);
    await this.ensureNameAvailable(name);

    const row = this.groups.create({
      id: randomUUID(),
      name,
      description: (input.description ?? '').trim(),
    });
    await this.groups.save(row);
    return { ...this.toRecord(row), memberCount: 0 };
  }

  async update(groupId: string, input: { name?: string; description?: string }) {
    const row = await this.requireGroup(groupId);

    if (input.name != null) {
      const name = this.normalizeName(input.name);
      await this.ensureNameAvailable(name, groupId);
      row.name = name;
    }
    if (input.description != null) {
      row.description = input.description.trim();
    }

    await this.groups.save(row);
    const memberCount = await this.members.count({ where: { groupId } });
    return { ...this.toRecord(row), memberCount };
  }

  async remove(groupId: string) {
    const row = await this.requireGroup(groupId);
    await this.groups.remove(row);
    return { ok: true };
  }

  async getMembers(groupId: string) {
    await this.requireGroup(groupId);
    const rows = await this.members.find({
      where: { groupId },
      order: { userId: 'ASC' },
    });
    return { groupId, userIds: rows.map((r) => r.userId) };
  }

  async setMembers(groupId: string, userIds: string[]) {
    await this.requireGroup(groupId);
    const unique = this.normalizeUserIds(userIds);

    await this.members.delete({ groupId });
    if (unique.length) {
      await this.members.save(
        unique.map((userId) => this.members.create({ groupId, userId })),
      );
    }
    return { groupId, userIds: unique };
  }

  async getCategoryGroups(categoryId: string) {
    await this.requireCategory(categoryId);
    const links = await this.categoryLinks.find({
      where: { categoryId },
      order: { groupId: 'ASC' },
    });
    return { categoryId, groupIds: links.map((l) => l.groupId) };
  }

  async setCategoryGroups(categoryId: string, groupIds: string[]) {
    await this.requireCategory(categoryId);
    const unique = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];

    if (unique.length) {
      const existing = await this.groups.find({ where: { id: In(unique) } });
      if (existing.length !== unique.length) {
        throw new BadRequestException({
          type: 'validation_error',
          detail: 'One or more access groups not found',
        });
      }
    }

    await this.categoryLinks.delete({ categoryId });
    if (unique.length) {
      await this.categoryLinks.save(
        unique.map((groupId) => this.categoryLinks.create({ categoryId, groupId })),
      );
    }
    return { categoryId, groupIds: unique };
  }

  /** Group ids linked to each category (empty ⇒ public). */
  async loadGroupsByCategory(categoryIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    for (const id of categoryIds) map.set(id, []);
    if (!categoryIds.length) return map;

    const rows = await this.categoryLinks.find({
      where: { categoryId: In(categoryIds) },
    });
    for (const row of rows) {
      const bucket = map.get(row.categoryId) ?? [];
      bucket.push(row.groupId);
      map.set(row.categoryId, bucket);
    }
    return map;
  }

  /** Groups the viewer belongs to. */
  async loadViewerGroupIds(viewerId?: string | null): Promise<Set<string>> {
    if (!viewerId) return new Set();
    const rows = await this.members.find({ where: { userId: viewerId } });
    return new Set(rows.map((r) => r.groupId));
  }

  private async memberCounts(groupIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const id of groupIds) map.set(id, 0);
    if (!groupIds.length) return map;

    const rows = await this.members.find({ where: { groupId: In(groupIds) } });
    for (const row of rows) {
      map.set(row.groupId, (map.get(row.groupId) ?? 0) + 1);
    }
    return map;
  }

  private toRecord(row: AccessGroupEntity) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private normalizeName(raw: string): string {
    const name = raw.trim();
    if (!name || name.length > 128) {
      throw new BadRequestException({
        type: 'validation_error',
        detail: 'Group name must be 1–128 characters',
      });
    }
    return name;
  }

  private normalizeUserIds(userIds: string[]): string[] {
    return [
      ...new Set(
        userIds
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && id.length <= 128),
      ),
    ];
  }

  private async requireGroup(groupId: string): Promise<AccessGroupEntity> {
    const row = await this.groups.findOne({ where: { id: groupId } });
    if (!row) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Access group ${groupId} not found`,
      });
    }
    return row;
  }

  private async requireCategory(categoryId: string): Promise<CategoryEntity> {
    const row = await this.categories.findOne({ where: { id: categoryId } });
    if (!row) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Category ${categoryId} not found`,
      });
    }
    return row;
  }

  private async ensureNameAvailable(name: string, excludeId?: string) {
    const existing = await this.groups.findOne({ where: { name } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        type: 'name_taken',
        detail: `Access group "${name}" already exists`,
      });
    }
  }
}
