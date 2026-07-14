import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  validateMetadataSchema,
  type MetadataSchema,
} from '../../common/metadata-schema';
import { SEED_CATEGORIES } from '../../config/default-seed';
import { PeriodCategoryEntity } from '../../entities/period-category.entity';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(PeriodCategoryEntity)
    private readonly repo: Repository<PeriodCategoryEntity>,
  ) {}

  async onModuleInit() {
    for (const seed of SEED_CATEGORIES) {
      const existing = await this.repo.findOne({ where: { slug: seed.slug } });
      if (existing) continue;
      await this.repo.save(
        this.repo.create({
          slug: seed.slug,
          title: seed.title,
          description: seed.description,
          sortOrder: seed.sortOrder,
          metadataSchema: seed.metadataSchema,
          isActive: true,
        }),
      );
    }
  }

  list(activeOnly = false) {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
  }

  async get(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  async getBySlug(slug: string) {
    const row = await this.repo.findOne({ where: { slug } });
    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    sortOrder?: number;
    metadataSchema?: MetadataSchema;
    isActive?: boolean;
  }) {
    let schema: MetadataSchema = { fields: [] };
    try {
      schema = validateMetadataSchema(input.metadataSchema ?? { fields: [] });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid schema');
    }

    const row = this.repo.create({
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: input.description ?? '',
      sortOrder: input.sortOrder ?? 0,
      metadataSchema: schema,
      isActive: input.isActive ?? true,
    });
    try {
      return await this.repo.save(row);
    } catch {
      throw new BadRequestException('slug already exists');
    }
  }

  async update(
    id: string,
    patch: {
      title?: string;
      description?: string;
      sortOrder?: number;
      metadataSchema?: MetadataSchema;
      isActive?: boolean;
    },
  ) {
    const row = await this.get(id);
    if (patch.title !== undefined) row.title = patch.title.trim();
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    if (patch.metadataSchema !== undefined) {
      try {
        row.metadataSchema = validateMetadataSchema(patch.metadataSchema);
      } catch (e) {
        throw new BadRequestException(e instanceof Error ? e.message : 'Invalid schema');
      }
    }
    return this.repo.save(row);
  }

  async remove(id: string) {
    const row = await this.get(id);
    await this.repo.remove(row);
    return { ok: true as const };
  }
}
