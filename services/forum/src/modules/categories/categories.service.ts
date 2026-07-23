import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { CategoryAllowedUserEntity } from '../../entities/category-allowed-user.entity';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';

export type CategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  restricted: boolean;
  allowedUserIds?: string[];
  children: CategoryNode[];
};

export type CategoryAccessViewer = {
  viewerId?: string | null;
  isAdmin?: boolean;
  /** Include allowedUserIds on each node (admin UI). */
  includeMembers?: boolean;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CategoryAllowedUserEntity)
    private readonly allowlist: Repository<CategoryAllowedUserEntity>,
  ) {}

  async listTree(access: CategoryAccessViewer = {}) {
    const rows = await this.categories.find({ order: { sortOrder: 'ASC', title: 'ASC' } });
    const allowByCategory = await this.loadAllowByCategory(rows.map((r) => r.id));
    const visible = rows.filter((row) =>
      this.isAllowed(row.id, allowByCategory, access.viewerId, access.isAdmin),
    );
    return {
      data: this.buildTree(visible, allowByCategory, Boolean(access.includeMembers)),
    };
  }

  /** Category ids the viewer may use (empty allowlist or listed / admin). */
  async listAccessibleCategoryIds(access: CategoryAccessViewer = {}): Promise<string[]> {
    const rows = await this.categories.find({ select: ['id'] });
    const ids = rows.map((r) => r.id);
    const allowByCategory = await this.loadAllowByCategory(ids);
    return ids.filter((id) => this.isAllowed(id, allowByCategory, access.viewerId, access.isAdmin));
  }

  async assertAccessible(categoryId: string, access: CategoryAccessViewer = {}) {
    await this.requireCategory(categoryId);
    const allowByCategory = await this.loadAllowByCategory([categoryId]);
    if (!this.isAllowed(categoryId, allowByCategory, access.viewerId, access.isAdmin)) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нет доступа к этой категории',
      });
    }
  }

  async getMembers(categoryId: string) {
    await this.requireCategory(categoryId);
    const rows = await this.allowlist.find({
      where: { categoryId },
      order: { userId: 'ASC' },
    });
    return { categoryId, userIds: rows.map((r) => r.userId) };
  }

  async setMembers(categoryId: string, userIds: string[]) {
    await this.requireCategory(categoryId);
    const unique = [
      ...new Set(
        userIds
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && id.length <= 128),
      ),
    ];

    await this.allowlist.delete({ categoryId });
    if (unique.length) {
      await this.allowlist.save(
        unique.map((userId) =>
          this.allowlist.create({
            categoryId,
            userId,
          }),
        ),
      );
    }
    return { categoryId, userIds: unique };
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
  }) {
    const slug = this.normalizeSlug(input.slug);
    const title = input.title.trim();
    if (!title) {
      throw new BadRequestException({ type: 'validation_error', detail: 'Title is required' });
    }

    const parentId = input.parentId ?? null;
    if (parentId) {
      await this.requireCategory(parentId);
    }

    await this.ensureSlugAvailable(slug);

    const row = this.categories.create({
      id: randomUUID(),
      parentId,
      slug,
      title,
      description: (input.description ?? '').trim(),
      policy: { allowComments: true },
      sortOrder: input.sortOrder ?? 0,
    });
    await this.categories.save(row);
    return this.toRecord(row, false, []);
  }

  async update(
    categoryId: string,
    input: {
      slug?: string;
      title?: string;
      description?: string;
      parentId?: string | null;
      sortOrder?: number;
    },
  ) {
    const row = await this.requireCategory(categoryId);

    if (input.slug != null) {
      const slug = this.normalizeSlug(input.slug);
      await this.ensureSlugAvailable(slug, categoryId);
      row.slug = slug;
    }

    if (input.title != null) {
      const title = input.title.trim();
      if (!title) {
        throw new BadRequestException({ type: 'validation_error', detail: 'Title is required' });
      }
      row.title = title;
    }

    if (input.description != null) {
      row.description = input.description.trim();
    }

    if (input.sortOrder != null) {
      row.sortOrder = input.sortOrder;
    }

    if (input.parentId !== undefined) {
      const parentId = input.parentId;
      if (parentId === categoryId) {
        throw new BadRequestException({
          type: 'validation_error',
          detail: 'Category cannot be its own parent',
        });
      }
      if (parentId) {
        await this.requireCategory(parentId);
        await this.ensureNoCycle(categoryId, parentId);
      }
      row.parentId = parentId;
    }

    await this.categories.save(row);
    const members = await this.getMembers(categoryId);
    return this.toRecord(row, members.userIds.length > 0, members.userIds);
  }

  async remove(categoryId: string) {
    const row = await this.requireCategory(categoryId);

    const childCount = await this.categories.count({ where: { parentId: categoryId } });
    if (childCount > 0) {
      throw new ConflictException({
        type: 'category_has_children',
        detail: 'Remove or move child categories first',
      });
    }

    const topicCount = await this.topics.count({ where: { categoryId } });
    if (topicCount > 0) {
      throw new ConflictException({
        type: 'category_has_topics',
        detail: 'Move or delete topics in this category first',
      });
    }

    await this.categories.remove(row);
    return { ok: true };
  }

  private isAllowed(
    categoryId: string,
    allowByCategory: Map<string, string[]>,
    viewerId?: string | null,
    isAdmin?: boolean,
  ): boolean {
    if (isAdmin) return true;
    const allowed = allowByCategory.get(categoryId) ?? [];
    if (allowed.length === 0) return true;
    if (!viewerId) return false;
    return allowed.includes(viewerId);
  }

  private async loadAllowByCategory(categoryIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    for (const id of categoryIds) map.set(id, []);
    if (!categoryIds.length) return map;

    const rows = await this.allowlist.find({
      where: { categoryId: In(categoryIds) },
    });
    for (const row of rows) {
      const bucket = map.get(row.categoryId) ?? [];
      bucket.push(row.userId);
      map.set(row.categoryId, bucket);
    }
    return map;
  }

  private buildTree(
    rows: CategoryEntity[],
    allowByCategory: Map<string, string[]>,
    includeMembers: boolean,
  ): CategoryNode[] {
    const byParent = new Map<string | null, CategoryEntity[]>();

    for (const row of rows) {
      const key = row.parentId;
      const bucket = byParent.get(key) ?? [];
      bucket.push(row);
      byParent.set(key, bucket);
    }

    const build = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? []).map((row) => {
        const allowedUserIds = allowByCategory.get(row.id) ?? [];
        const restricted = allowedUserIds.length > 0;
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description,
          parentId: row.parentId,
          sortOrder: row.sortOrder,
          restricted,
          ...(includeMembers ? { allowedUserIds } : {}),
          children: build(row.id),
        };
      });

    return build(null);
  }

  private toRecord(row: CategoryEntity, restricted: boolean, allowedUserIds: string[]) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      restricted,
      allowedUserIds,
    };
  }

  private normalizeSlug(raw: string): string {
    const slug = raw.trim().toLowerCase();
    if (!slug || slug.length > 64 || !SLUG_RE.test(slug)) {
      throw new BadRequestException({
        type: 'validation_error',
        detail: 'Slug must be 1–64 lowercase letters, digits, and hyphens',
      });
    }
    return slug;
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

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.categories.findOne({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        type: 'slug_taken',
        detail: `Slug "${slug}" is already used`,
      });
    }
  }

  private async ensureNoCycle(categoryId: string, parentId: string) {
    let current: string | null = parentId;
    while (current) {
      if (current === categoryId) {
        throw new BadRequestException({
          type: 'validation_error',
          detail: 'Parent would create a cycle in the category tree',
        });
      }
      const parent = await this.categories.findOne({ where: { id: current } });
      current = parent?.parentId ?? null;
    }
  }
}
