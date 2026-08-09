import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { validateMetadataValues } from '../../common/metadata-schema';
import { cmpDate as cmpDateImported, validateSiblingPartition } from '../../common/partition';
import { PeriodCategoryEntity } from '../../entities/period-category.entity';
import { PeriodEntity } from '../../entities/period.entity';
import { CategoriesService } from '../categories/categories.service';

export type PeriodTreeNode = PeriodEntity & { children?: PeriodTreeNode[] };

export type QueryPeriodsInput = {
  categoryId?: string;
  categorySlug?: string;
  from?: string;
  to?: string;
  parentId?: string | null;
  rootId?: string;
  rootsOnly?: boolean;
  maxDepth?: number;
  metadata?: Record<string, unknown>;
  view?: 'flat' | 'tree';
};

const ISO_DATE_RE = /^-?\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value: string): string {
  // Strip time component if present (e.g. "2024-01-15T00:00:00Z" → "2024-01-15")
  // For BCE dates: "-0001-01-01T00:00:00Z" → "-0001-01-01"
  const sliced = value.slice(0, 10);
  if (!ISO_DATE_RE.test(sliced)) {
    throw new BadRequestException(`Invalid date format: "${value}" (expected YYYY-MM-DD or -YYYY-MM-DD)`);
  }
  return sliced;
}

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly repo: Repository<PeriodEntity>,
    private readonly categories: CategoriesService,
  ) {}

  private toDateString(value: string | Date): string {
    if (typeof value === 'string') return normalizeDate(value);
    return value.toISOString().slice(0, 10);
  }

  private async assertPartition(parent: PeriodEntity) {
    const siblings = await this.repo.find({
      where: { parentId: parent.id },
      order: { sortIndex: 'ASC' },
    });
    const violation = validateSiblingPartition(
      {
        startsOn: this.toDateString(parent.startsOn),
        endsOn: this.toDateString(parent.endsOn),
      },
      siblings.map((s) => ({
        startsOn: this.toDateString(s.startsOn),
        endsOn: this.toDateString(s.endsOn),
      })),
    );
    if (violation) {
      throw new BadRequestException({
        message: 'Sibling partition invalid',
        violation,
      });
    }
  }

  async get(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Period not found');
    return row;
  }

  async create(input: {
    categoryId?: string;
    parentId?: string | null;
    startsOn: string;
    endsOn: string;
    title: string;
    summary?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    sortIndex?: number;
  }) {
    let category: PeriodCategoryEntity;
    let parent: PeriodEntity | null = null;
    let depth = 0;
    let categoryId = '';

    if (input.parentId) {
      parent = await this.get(input.parentId);
      category = await this.categories.get(parent.categoryId);
      if (input.categoryId && input.categoryId !== parent.categoryId) {
        throw new BadRequestException('categoryId is inherited from parent and cannot change');
      }
      categoryId = parent.categoryId;
      depth = parent.depth + 1;
    } else {
      if (!input.categoryId) throw new BadRequestException('categoryId required for root');
      category = await this.categories.get(input.categoryId);
      categoryId = category.id;
      depth = 0;
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = validateMetadataValues(category.metadataSchema, input.metadata);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid metadata');
    }

    const startsOn = normalizeDate(input.startsOn);
    const endsOn = normalizeDate(input.endsOn);
    if (cmpDateImported(startsOn, endsOn) > 0) {
      throw new BadRequestException('startsOn must be ≤ endsOn');
    }

    let sortIndex = input.sortIndex;
    if (sortIndex === undefined) {
      const count = await this.repo.count({
        where: { parentId: parent ? parent.id : IsNull() },
      });
      sortIndex = count;
    }

    const row = this.repo.create({
      categoryId,
      parentId: parent?.id ?? null,
      rootId: parent?.rootId ?? '00000000-0000-4000-8000-000000000000',
      depth,
      sortIndex,
      startsOn,
      endsOn,
      title: input.title.trim(),
      summary: input.summary ?? '',
      body: input.body ?? '',
      metadata,
    });

    const saved = await this.repo.save(row);
    if (!parent) {
      saved.rootId = saved.id;
      return this.repo.save(saved);
    }
    await this.assertPartition(parent);
    return saved;
  }

  async update(
    id: string,
    patch: {
      startsOn?: string;
      endsOn?: string;
      title?: string;
      summary?: string;
      body?: string;
      metadata?: Record<string, unknown>;
      sortIndex?: number;
      categoryId?: string;
    },
  ) {
    const row = await this.get(id);
    if (patch.categoryId !== undefined && patch.categoryId !== row.categoryId) {
      throw new BadRequestException('categoryId cannot be changed');
    }

    this.applyPeriodPatch(row, patch);

    if (cmpDateImported(this.toDateString(row.startsOn), this.toDateString(row.endsOn)) > 0) {
      throw new BadRequestException('startsOn must be ≤ endsOn');
    }

    if (patch.metadata !== undefined) {
      await this.setValidatedMetadata(row, patch.metadata);
    }

    const saved = await this.repo.save(row);

    if (saved.parentId) {
      const parent = await this.get(saved.parentId);
      await this.assertPartition(parent);
    }
    await this.assertPartition(saved);

    return saved;
  }

  private applyPeriodPatch(
    row: PeriodEntity,
    patch: {
      startsOn?: string;
      endsOn?: string;
      title?: string;
      summary?: string;
      body?: string;
      sortIndex?: number;
    },
  ): void {
    if (patch.title !== undefined) row.title = patch.title.trim();
    if (patch.summary !== undefined) row.summary = patch.summary;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.sortIndex !== undefined) row.sortIndex = patch.sortIndex;
    if (patch.startsOn !== undefined) row.startsOn = normalizeDate(patch.startsOn);
    if (patch.endsOn !== undefined) row.endsOn = normalizeDate(patch.endsOn);
  }

  private async setValidatedMetadata(row: PeriodEntity, metadata: Record<string, unknown>): Promise<void> {
    const category = await this.categories.get(row.categoryId);
    try {
      row.metadata = validateMetadataValues(category.metadataSchema, metadata);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid metadata');
    }
  }

  async remove(id: string) {
    const row = await this.get(id);
    const childCount = await this.repo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BadRequestException('Remove children first');
    }
    const parentId = row.parentId;
    await this.repo.remove(row);
    if (parentId) {
      const parent = await this.get(parentId);
      await this.assertPartition(parent);
    }
    return { ok: true as const };
  }

  /**
   * Atomically replace all children of parent with the given partition list.
   */
  async replaceChildren(
    parentId: string,
    children: Array<{
      id?: string;
      startsOn: string;
      endsOn: string;
      title: string;
      summary?: string;
      body?: string;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    const parent = await this.get(parentId);
    const category = await this.categories.get(parent.categoryId);

    const bounds = children.map((c) => ({
      startsOn: normalizeDate(c.startsOn),
      endsOn: normalizeDate(c.endsOn),
    }));
    const violation = validateSiblingPartition(
      {
        startsOn: this.toDateString(parent.startsOn),
        endsOn: this.toDateString(parent.endsOn),
      },
      bounds,
    );
    if (violation) {
      throw new BadRequestException({ message: 'Invalid partition', violation });
    }

    const existing = await this.repo.find({ where: { parentId } });
    await this.removeDroppedChildren(parentId, existing, children);

    const result: PeriodEntity[] = [];
    for (let i = 0; i < children.length; i++) {
      result.push(await this.upsertChildPeriod(parent, category, children[i]!, i));
    }

    return { data: result };
  }

  private async removeDroppedChildren(
    parentId: string,
    existing: PeriodEntity[],
    children: Array<{ id?: string }>,
  ): Promise<void> {
    const keepIds = new Set(children.map((c) => c.id).filter(Boolean) as string[]);
    for (const old of existing) {
      if (keepIds.has(old.id)) continue;

      const grand = await this.repo.count({ where: { parentId: old.id } });
      if (grand > 0) {
        throw new BadRequestException(`Cannot drop period ${old.id}: has children`);
      }
      await this.repo.remove(old);
    }
  }

  private async upsertChildPeriod(
    parent: PeriodEntity,
    category: PeriodCategoryEntity,
    child: {
      id?: string;
      startsOn: string;
      endsOn: string;
      title: string;
      summary?: string;
      body?: string;
      metadata?: Record<string, unknown>;
    },
    sortIndex: number,
  ): Promise<PeriodEntity> {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = validateMetadataValues(category.metadataSchema, child.metadata);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid metadata');
    }

    if (child.id) {
      const row = await this.get(child.id);
      if (row.parentId !== parent.id) {
        throw new BadRequestException(`Period ${child.id} is not a child of parent`);
      }
      row.startsOn = normalizeDate(child.startsOn);
      row.endsOn = normalizeDate(child.endsOn);
      row.title = child.title.trim();
      row.summary = child.summary ?? row.summary;
      row.body = child.body ?? row.body;
      row.metadata = metadata;
      row.sortIndex = sortIndex;
      return this.repo.save(row);
    }

    const row = this.repo.create({
      categoryId: parent.categoryId,
      parentId: parent.id,
      rootId: parent.rootId,
      depth: parent.depth + 1,
      sortIndex,
      startsOn: normalizeDate(child.startsOn),
      endsOn: normalizeDate(child.endsOn),
      title: child.title.trim(),
      summary: child.summary ?? '',
      body: child.body ?? '',
      metadata,
    });
    return this.repo.save(row);
  }

  async query(input: QueryPeriodsInput): Promise<PeriodEntity[] | PeriodTreeNode[]> {
    const categoryId = await this.resolveQueryCategoryId(input);
    const qb = this.repo.createQueryBuilder('p').orderBy('p.startsOn', 'ASC').addOrderBy('p.sortIndex', 'ASC');

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (input.rootId) qb.andWhere('p.rootId = :rootId', { rootId: input.rootId });

    this.applyQueryViewFilters(qb, input);
    this.applyQueryDateFilters(qb, input);
    this.applyQueryMetadataFilter(qb, input);
    await this.applyQueryMaxDepthFilter(qb, input);

    const rows = await qb.getMany();
    if (input.view === 'flat') return rows;
    return this.buildTree(rows);
  }

  private async resolveQueryCategoryId(input: QueryPeriodsInput): Promise<string | undefined> {
    if (input.categoryId) return input.categoryId;
    if (!input.categorySlug) return undefined;
    const cat = await this.categories.getBySlug(input.categorySlug);
    return cat.id;
  }

  private applyQueryViewFilters(
    qb: ReturnType<Repository<PeriodEntity>['createQueryBuilder']>,
    input: QueryPeriodsInput,
  ): void {
    if (input.view === 'tree') {
      if (input.parentId) {
        qb.andWhere('(p.id = :treeRoot OR p.rootId = :treeRoot)', {
          treeRoot: input.parentId,
        });
      }
      return;
    }

    if (input.rootsOnly) {
      qb.andWhere('p.parentId IS NULL');
      return;
    }
    if (input.parentId === undefined) return;
    if (input.parentId === null) qb.andWhere('p.parentId IS NULL');
    else qb.andWhere('p.parentId = :parentId', { parentId: input.parentId });
  }

  private applyQueryDateFilters(
    qb: ReturnType<Repository<PeriodEntity>['createQueryBuilder']>,
    input: QueryPeriodsInput,
  ): void {
    if (input.from) {
      qb.andWhere('p.endsOn >= :from', { from: normalizeDate(input.from) });
    }
    if (input.to) {
      qb.andWhere('p.startsOn <= :to', { to: normalizeDate(input.to) });
    }
  }

  private applyQueryMetadataFilter(
    qb: ReturnType<Repository<PeriodEntity>['createQueryBuilder']>,
    input: QueryPeriodsInput,
  ): void {
    if (!input.metadata || Object.keys(input.metadata).length === 0) return;
    qb.andWhere('p.metadata @> :metadata::jsonb', {
      metadata: JSON.stringify(input.metadata),
    });
  }

  private async applyQueryMaxDepthFilter(
    qb: ReturnType<Repository<PeriodEntity>['createQueryBuilder']>,
    input: QueryPeriodsInput,
  ): Promise<void> {
    if (input.maxDepth === undefined) return;

    const baseDepth = await this.resolveQueryBaseDepth(input);
    qb.andWhere('p.depth <= :maxAbsDepth', {
      maxAbsDepth: baseDepth + input.maxDepth,
    });
  }

  private async resolveQueryBaseDepth(input: QueryPeriodsInput): Promise<number> {
    if (input.parentId && input.parentId !== null) {
      return (await this.get(input.parentId)).depth;
    }
    if (input.rootId) {
      return (await this.get(input.rootId)).depth;
    }
    return -1;
  }

  private buildTree(rows: PeriodEntity[]): PeriodTreeNode[] {
    const byId = new Map<string, PeriodTreeNode>();
    for (const row of rows) {
      byId.set(row.id, { ...row, children: [] });
    }
    const roots: PeriodTreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children!.push(node);
      } else if (!node.parentId || !byId.has(node.parentId)) {
        roots.push(node);
      }
    }
    const sortRec = (nodes: PeriodTreeNode[]) => {
      nodes.sort((a, b) => a.sortIndex - b.sortIndex || cmpDateImported(a.startsOn, b.startsOn));
      for (const n of nodes) if (n.children?.length) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }
}
