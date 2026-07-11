import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('internal/v1/categories')
export class InternalCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  listTree() {
    return this.categories.listTree();
  }
}
