import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CRIMEA_PERIOD_TREES,
  type SeedPeriodNode,
} from '../../config/crimea-seed';
import { PeriodEntity } from '../../entities/period.entity';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class PeriodsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PeriodsSeedService.name);

  constructor(
    @InjectRepository(PeriodEntity)
    private readonly periods: Repository<PeriodEntity>,
    private readonly categories: CategoriesService,
  ) {}

  async onModuleInit() {
    const count = await this.periods.count();
    if (count > 0) {
      this.logger.log(`Periods already present (${count}) — skip Crimea seed`);
      return;
    }

    let created = 0;
    for (const tree of CRIMEA_PERIOD_TREES) {
      let category;
      try {
        category = await this.categories.getBySlug(tree.categorySlug);
      } catch {
        this.logger.warn(`Category ${tree.categorySlug} missing — skip tree`);
        continue;
      }

      for (const [i, root] of tree.roots.entries()) {
        created += await this.insertNode({
          node: root,
          categoryId: category.id,
          parentId: null,
          rootId: null,
          depth: 0,
          sortIndex: i,
        });
      }
    }

    this.logger.log(`Crimea / Black Sea seed complete — ${created} periods`);
  }

  private async insertNode(input: {
    node: SeedPeriodNode;
    categoryId: string;
    parentId: string | null;
    rootId: string | null;
    depth: number;
    sortIndex: number;
  }): Promise<number> {
    const row = this.periods.create({
      categoryId: input.categoryId,
      parentId: input.parentId,
      rootId: input.rootId ?? '00000000-0000-4000-8000-000000000000',
      depth: input.depth,
      sortIndex: input.sortIndex,
      startsOn: input.node.startsOn,
      endsOn: input.node.endsOn,
      title: input.node.title,
      summary: input.node.summary,
      body: input.node.body ?? '',
      metadata: input.node.metadata ?? {},
    });
    const saved = await this.periods.save(row);
    if (!input.parentId) {
      saved.rootId = saved.id;
      await this.periods.save(saved);
    }

    let n = 1;
    const children = input.node.children ?? [];
    for (const [i, child] of children.entries()) {
      n += await this.insertNode({
        node: child,
        categoryId: input.categoryId,
        parentId: saved.id,
        rootId: saved.rootId,
        depth: input.depth + 1,
        sortIndex: i,
      });
    }
    return n;
  }
}
