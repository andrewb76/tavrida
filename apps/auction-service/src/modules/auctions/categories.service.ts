import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-crud.dto';
import { slugify } from 'src/common/helpers';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

/**
 * Проверяет, является ли категория листовой (не имеет дочерних)
 */
  async isLeaf(categoryId: string): Promise<boolean> {
    const count = await this.categoryRepository.count({
      where: { parent: { id: categoryId } },
    });
    return count === 0;
  }

  async findAllDescendantIds(categoryId: string): Promise<string[]> {
    const result = await this.categoryRepository.query(
      `
      WITH RECURSIVE category_tree AS (
        SELECT id, "parentId"
        FROM categories
        WHERE id = $1
        UNION ALL
        SELECT c.id, c."parentId"
        FROM categories c
        INNER JOIN category_tree ct ON c."parentId" = ct.id
      )
      SELECT id FROM category_tree WHERE id != $1;
      `,
      [categoryId]
    );
    return result.map(row => row.id);
  }

  /**
   * Получить ПОЛНОЕ дерево категорий (идеально для PrimeVue Tree)
   */
  async getTree(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { parent: null }, // Начинаем с верхнего уровня
      relations: ['children', 'children.children', 'children.children.children'], // Загружаем вложенность
    });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = new Category();
    category.name = dto.name;
    category.slug = slugify(dto.name);

    if (dto.parentId) {
      const parent = await this.categoryRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Родительская категория не найдена.');
      category.parent = parent;
    }

    return await this.categoryRepository.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id }, relations: ['parent'] });
    if (!category) throw new NotFoundException('Категория не найдена.');

    if (dto.name) {
      category.name = dto.name;
      category.slug = slugify(dto.name);
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        category.parent = null; // Делаем категорию корневой
      } else {
        if (dto.parentId === id) throw new BadRequestException('Категория не может быть родителем самой себе.');
        const parent = await this.categoryRepository.findOne({ where: { id: dto.parentId } });
        if (!parent) throw new NotFoundException('Новая родительская категория не найдена.');
        category.parent = parent;
      }
    }

    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const category = await this.categoryRepository.findOne({ 
      where: { id },
      relations: ['children', 'children.children'] // можно загрузить сразу несколько уровней
    });
    if (!category) throw new NotFoundException('Категория не найдена.');

    // Собираем все ID подкатегорий рекурсивно
    const categoryIds = this.collectAllSubcategoryIds(category);
    categoryIds.push(id); // добавить саму категорию

    const descendantIds = await this.findAllDescendantIds(id);
    const allIds = [id, ...descendantIds];

    // Проверяем, есть ли аукционы в этих категориях
    const auctionCount = await this.categoryRepository
      .createQueryBuilder('cat')
      .innerJoin('cat.auctions', 'auction')
      .where('cat.id IN (:...ids)', { ids: allIds })
      .getCount();

    if (auctionCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить категорию, так как она (или её подкатегории) содержит ${auctionCount} лотов. Сначала переместите или удалите эти лоты.`
      );
    }

    // Если лотов нет, удаляем категорию (каскадно удалятся подкатегории, так как в связи parent есть onDelete: 'CASCADE')
    await this.categoryRepository.remove(category);
    return { deleted: true };
  }

  private collectAllSubcategoryIds(category: Category): string[] {
    const ids: string[] = [];
    for (const child of category.children || []) {
      ids.push(child.id);
      // рекурсивно для детей, если они загружены
      if (child.children?.length) {
        ids.push(...this.collectAllSubcategoryIds(child));
      }
    }
    return ids;
  }
}
