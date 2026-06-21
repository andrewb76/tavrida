import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-crud.dto';
import { Category } from './entities/category.entity';
import { CurrentUser } from '../auth/user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Категории товаров (Categories)')
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Получить полное дерево категорий', description: 'Возвращает иерархическую структуру категорий для построения меню и фильтров.' })
  @ApiResponse({ status: 200, type: [Category] })
  async getTree() {
    return await this.categoriesService.getTree();
  }

  @Post()
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать категорию/подкатегорию', description: 'Добавляет элемент в дерево категорий.' })
  @ApiResponse({ status: 201, type: Category })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: User
  ) {
    return await this.categoriesService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить категорию', description: 'Позволяет изменить название или перенести ветку к другому родителю.' })
  @ApiResponse({ status: 200, type: Category })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return await this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить категорию', description: 'Удаляет категорию и все ее подкатегории (Каскадно).' })
  @ApiResponse({ status: 200, description: 'Успешное удаление.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.categoriesService.remove(id);
  }
}
