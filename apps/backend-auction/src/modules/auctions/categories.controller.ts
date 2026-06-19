import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-crud.dto';
import { Category } from './entities/category.entity';

@ApiTags('Категории товаров (Categories)')
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('tree')
  @ApiOperation({ summary: 'Получить полное дерево категорий', description: 'Возвращает иерархическую структуру категорий для построения меню и фильтров.' })
  @ApiResponse({ status: 200, type: [Category] })
  async getTree() {
    return await this.categoriesService.getTree();
  }

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать категорию/подкатегорию', description: 'Добавляет элемент в дерево категорий.' })
  @ApiResponse({ status: 201, type: Category })
  async create(@Body() dto: CreateCategoryDto) {
    return await this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить категорию', description: 'Позволяет изменить название или перенести ветку к другому родителю.' })
  @ApiResponse({ status: 200, type: Category })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return await this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить категорию', description: 'Удаляет категорию и все ее подкатегории (Каскадно).' })
  @ApiResponse({ status: 200, description: 'Успешное удаление.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.categoriesService.remove(id);
  }
}
