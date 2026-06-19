import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-crud.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // Вспомогательная функция генерации ЧПУ (slug)
  private slugify(text: string): string {
    const ru = 'а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я'.split(' ');
    const en = 'a b v g d e yo zh z i y k l m n o p r s t u f kh ts ch sh shch _ y _ e yu ya'.split(' ');
    let res = text.toLowerCase().trim();
    ru.forEach((char, i) => res = res.replace(new RegExp(char, 'g'), en[i]));
    return res.replace(/[^a-z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
    category.slug = this.slugify(dto.name);

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
      category.slug = this.slugify(dto.name);
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
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена.');
    
    // Ввиду onDelete: 'CASCADE', удаление ветки удалит и подкатегории
    await this.categoryRepository.remove(category);
    return { deleted: true };
  }
}
