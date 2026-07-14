import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { validateMetadataValues } from '../../common/metadata-schema';
import { validateSiblingPartition } from '../../common/partition';
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

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(PeriodEntity)
    private readonly repo: Repository<PeriodEntity>,
    private readonly categories: CategoriesService,
  ) {}

  private toDateString(value: string | Date): string {
    if (typeof value === 'string') return value.slice(0, 10);
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

    const startsOn = input.startsOn.slice(0, 10);
    const endsOn = input.endsOn.slice(0, 10);
    if (startsOn > endsOn) {
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

    if (patch.title !== undefined) row.title = patch.title.trim();
    if (patch.summary !== undefined) row.summary = patch.summary;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.sortIndex !== undefined) row.sortIndex = patch.sortIndex;
    if (patch.startsOn !== undefined) row.startsOn = patch.startsOn.slice(0, 10);
    if (patch.endsOn !== undefined) row.endsOn = patch.endsOn.slice(0, 10);

    if (this.toDateString(row.startsOn) > this.toDateString(row.endsOn)) {
      throw new BadRequestException('startsOn must be ≤ endsOn');
    }

    if (patch.metadata !== undefined) {
      const category = await this.categories.get(row.categoryId);
      try {
        row.metadata = validateMetadataValues(category.metadataSchema, patch.metadata);
      } catch (e) {
        throw new BadRequestException(e instanceof Error ? e.message : 'Invalid metadata');
      }
    }

    const saved = await this.repo.save(row);

    if (saved.parentId) {
      const parent = await this.get(saved.parentId);
      await this.assertPartition(parent);
    }
    await this.assertPartition(saved);

    return saved;
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
      startsOn: c.startsOn.slice(0, 10),
      endsOn: c.endsOn.slice(0, 10),
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
    const keepIds = new Set(children.map((c) => c.id).filter(Boolean) as string[]);
    for (const old of existing) {
      if (!keepIds.has(old.id)) {
        const grand = await this.repo.count({ where: { parentId: old.id } });
        if (grand > 0) {
          throw new BadRequestException(`Cannot drop period ${old.id}: has children`);
        }
        await this.repo.remove(old);
      }
    }

    const result: PeriodEntity[] = [];
    for (let i = 0; i < children.length; i++) {
      const c = children[i]!;
      let metadata: Record<string, unknown> = {};
      try {
        metadata = validateMetadataValues(category.metadataSchema, c.metadata);
      } catch (e) {
        throw new BadRequestException(e instanceof Error ? e.message : 'Invalid metadata');
      }

      if (c.id) {
        const row = await this.get(c.id);
        if (row.parentId !== parentId) {
          throw new BadRequestException(`Period ${c.id} is not a child of parent`);
        }
        row.startsOn = c.startsOn.slice(0, 10);
        row.endsOn = c.endsOn.slice(0, 10);
        row.title = c.title.trim();
        row.summary = c.summary ?? row.summary;
        row.body = c.body ?? row.body;
        row.metadata = metadata;
        row.sortIndex = i;
        result.push(await this.repo.save(row));
      } else {
        const row = this.repo.create({
          categoryId: parent.categoryId,
          parentId: parent.id,
          rootId: parent.rootId,
          depth: parent.depth + 1,
          sortIndex: i,
          startsOn: c.startsOn.slice(0, 10),
          endsOn: c.endsOn.slice(0, 10),
          title: c.title.trim(),
          summary: c.summary ?? '',
          body: c.body ?? '',
          metadata,
        });
        result.push(await this.repo.save(row));
      }
    }

    return { data: result };
  }

  async query(input: QueryPeriodsInput): Promise<PeriodEntity[] | PeriodTreeNode[]> {
    let categoryId = input.categoryId;
    if (!categoryId && input.categorySlug) {
      const cat = await this.categories.getBySlug(input.categorySlug);
      categoryId = cat.id;
    }

    const qb = this.repo.createQueryBuilder('p').orderBy('p.startsOn', 'ASC').addOrderBy('p.sortIndex', 'ASC');

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (input.rootId) qb.andWhere('p.rootId = :rootId', { rootId: input.rootId });

    if (input.view !== 'tree') {
      if (input.rootsOnly) {
        qb.andWhere('p.parentId IS NULL');
      } else if (input.parentId !== undefined) {
        if (input.parentId === null) qb.andWhere('p.parentId IS NULL');
        else qb.andWhere('p.parentId = :parentId', { parentId: input.parentId });
      }
    } else if (input.parentId) {
      // tree rooted at a specific node: load that subtree via root filter after fetch
      qb.andWhere('(p.id = :treeRoot OR p.rootId = :treeRoot)', {
        treeRoot: input.parentId,
      });
    } else if (input.rootsOnly === false && input.parentId === undefined && input.rootId) {
      // already filtered by rootId
    }

    if (input.from) {
      qb.andWhere('p.endsOn >= :from', { from: input.from.slice(0, 10) });
    }
    if (input.to) {
      qb.andWhere('p.startsOn <= :to', { to: input.to.slice(0, 10) });
    }

    if (input.metadata && Object.keys(input.metadata).length > 0) {
      qb.andWhere('p.metadata @> :metadata::jsonb', {
        metadata: JSON.stringify(input.metadata),
      });
    }

    if (input.maxDepth !== undefined) {
      const baseDepth =
        input.parentId && input.parentId !== null
          ? (await this.get(input.parentId)).depth
          : input.rootId
            ? (await this.get(input.rootId)).depth
            : -1;
      qb.andWhere('p.depth <= :maxAbsDepth', {
        maxAbsDepth: baseDepth + input.maxDepth,
      });
    }

    const rows = await qb.getMany();
    if (input.view === 'flat') return rows;
    return this.buildTree(rows);
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
      nodes.sort((a, b) => a.sortIndex - b.sortIndex || a.startsOn.localeCompare(b.startsOn));
      for (const n of nodes) if (n.children?.length) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }
}
