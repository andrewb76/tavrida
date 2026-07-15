import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TagEntity } from '../../entities/tag.entity';

const DEFAULT_CATEGORY_SLUG = 'general';

const OFFICIAL_TAGS: Array<{ slug: string; displayName: string; description: string }> = [
  { slug: 'krym', displayName: 'Крым', description: 'Находки и обсуждения по Крыму' },
  { slug: 'monety', displayName: 'Монеты', description: 'Нумизматика' },
  { slug: 'keramika', displayName: 'Керамика', description: 'Керамика и фрагменты' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(TagEntity)
    private readonly tags: Repository<TagEntity>,
  ) {}

  async onModuleInit() {
    await this.ensureCategory();
    await this.ensureOfficialTags();
  }

  private async ensureCategory() {
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

  private async ensureOfficialTags() {
    for (const spec of OFFICIAL_TAGS) {
      const existing = await this.tags.findOne({ where: { slug: spec.slug } });
      if (existing) continue;
      await this.tags.save(
        this.tags.create({
          id: randomUUID(),
          slug: spec.slug,
          displayName: spec.displayName,
          description: spec.description,
          color: null,
          isOfficial: true,
          isHidden: false,
          usageCount: 0,
        }),
      );
    }
  }
}
