import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../entities/category.entity';

const DEFAULT_CATEGORY_SLUG = 'general';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  async onModuleInit() {
    const existing = await this.categories.findOne({ where: { slug: DEFAULT_CATEGORY_SLUG } });
    if (existing) return;

    await this.categories.save(
      this.categories.create({
        id: randomUUID(),
        parentId: null,
        slug: DEFAULT_CATEGORY_SLUG,
        title: 'Общее',
        description: 'Общие обсуждения клуба',
        policy: { allowComments: true },
        sortOrder: 0,
      }),
    );
  }
}
