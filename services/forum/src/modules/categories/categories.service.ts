import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { AccessGroupsService } from '../access-groups/access-groups.service';

export type CategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  restricted: boolean;
  /** Published topics in this category (not subtree). */
  topicCount: number;
  /** Non-deleted comments on those published topics (not subtree). */
  commentCount: number;
  accessGroupIds?: string[];
  children: CategoryNode[];
};

type CategoryCounts = { topicCount: number; commentCount: number };

export type CategoryAccessViewer = {
  viewerId?: string | null;
  isAdmin?: boolean;
  /** Include accessGroupIds on each node (admin UI). */
  includeAccessGroups?: boolean;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    private readonly accessGroups: AccessGroupsService,
    private readonly dataSource: DataSource,
  ) {}

  async listTree(access: CategoryAccessViewer = {}) {
    const rows = await this.categories.find({ order: { sortOrder: 'ASC', title: 'ASC' } });
    const groupsByCategory = await this.accessGroups.loadGroupsByCategory(rows.map((r) => r.id));
    const viewerGroupIds = await this.accessGroups.loadViewerGroupIds(access.viewerId);
    const visible = rows.filter((row) =>
      this.isAllowed(row.id, groupsByCategory, viewerGroupIds, access.isAdmin),
    );
    const counts = await this.loadCountsByCategory();
    return {
      data: this.buildTree(
        visible,
        groupsByCategory,
        Boolean(access.includeAccessGroups),
        counts,
      ),
    };
  }

  /** Category ids the viewer may use (empty groups or OR member / admin). */
  async listAccessibleCategoryIds(access: CategoryAccessViewer = {}): Promise<string[]> {
    const rows = await this.categories.find({ select: { id: true } });
    const ids = rows.map((r) => r.id);
    const groupsByCategory = await this.accessGroups.loadGroupsByCategory(ids);
    const viewerGroupIds = await this.accessGroups.loadViewerGroupIds(access.viewerId);
    return ids.filter((id) =>
      this.isAllowed(id, groupsByCategory, viewerGroupIds, access.isAdmin),
    );
  }

  async assertAccessible(categoryId: string, access: CategoryAccessViewer = {}) {
    await this.requireCategory(categoryId);
    const groupsByCategory = await this.accessGroups.loadGroupsByCategory([categoryId]);
    const viewerGroupIds = await this.accessGroups.loadViewerGroupIds(access.viewerId);
    if (!this.isAllowed(categoryId, groupsByCategory, viewerGroupIds, access.isAdmin)) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нет доступа к этой категории',
      });
    }
  }

  async getAccessGroups(categoryId: string) {
    return this.accessGroups.getCategoryGroups(categoryId);
  }

  async setAccessGroups(categoryId: string, groupIds: string[]) {
    return this.accessGroups.setCategoryGroups(categoryId, groupIds);
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
    const linked = await this.getAccessGroups(categoryId);
    return this.toRecord(row, linked.groupIds.length > 0, linked.groupIds);
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
    groupsByCategory: Map<string, string[]>,
    viewerGroupIds: Set<string>,
    isAdmin?: boolean,
  ): boolean {
    if (isAdmin) return true;
    const linked = groupsByCategory.get(categoryId) ?? [];
    if (linked.length === 0) return true;
    return linked.some((groupId) => viewerGroupIds.has(groupId));
  }

  private async loadCountsByCategory(): Promise<Map<string, CategoryCounts>> {
    const topicRows = (await this.dataSource.query(
      `SELECT category_id AS "categoryId", COUNT(*)::int AS "topicCount"
       FROM forum.topic
       WHERE deleted_at IS NULL AND status = 'PUBLISHED'
       GROUP BY category_id`,
    )) as Array<{ categoryId: string; topicCount: number }>;

    const commentRows = (await this.dataSource.query(
      `SELECT t.category_id AS "categoryId", COUNT(c.id)::int AS "commentCount"
       FROM forum.comment c
       INNER JOIN forum.topic t ON t.id = c.topic_id
       WHERE c.deleted_at IS NULL
         AND t.deleted_at IS NULL
         AND t.status = 'PUBLISHED'
       GROUP BY t.category_id`,
    )) as Array<{ categoryId: string; commentCount: number }>;

    const counts = new Map<string, CategoryCounts>();
    for (const row of topicRows) {
      counts.set(row.categoryId, {
        topicCount: Number(row.topicCount) || 0,
        commentCount: 0,
      });
    }
    for (const row of commentRows) {
      const prev = counts.get(row.categoryId) ?? { topicCount: 0, commentCount: 0 };
      prev.commentCount = Number(row.commentCount) || 0;
      counts.set(row.categoryId, prev);
    }
    return counts;
  }

  private buildTree(
    rows: CategoryEntity[],
    groupsByCategory: Map<string, string[]>,
    includeAccessGroups: boolean,
    counts: Map<string, CategoryCounts>,
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
        const accessGroupIds = groupsByCategory.get(row.id) ?? [];
        const restricted = accessGroupIds.length > 0;
        const nodeCounts = counts.get(row.id) ?? { topicCount: 0, commentCount: 0 };
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description,
          parentId: row.parentId,
          sortOrder: row.sortOrder,
          restricted,
          topicCount: nodeCounts.topicCount,
          commentCount: nodeCounts.commentCount,
          ...(includeAccessGroups ? { accessGroupIds } : {}),
          children: build(row.id),
        };
      });

    return build(null);
  }

  private toRecord(row: CategoryEntity, restricted: boolean, accessGroupIds: string[]) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      restricted,
      accessGroupIds,
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
