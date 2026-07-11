import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../entities/category.entity';

export type CategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  children: CategoryNode[];
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  async listTree() {
    const rows = await this.categories.find({ order: { sortOrder: 'ASC', title: 'ASC' } });
    const byParent = new Map<string | null, CategoryEntity[]>();

    for (const row of rows) {
      const key = row.parentId;
      const bucket = byParent.get(key) ?? [];
      bucket.push(row);
      byParent.set(key, bucket);
    }

    const build = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        children: build(row.id),
      }));

    return { data: build(null) };
  }
}
