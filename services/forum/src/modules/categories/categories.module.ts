import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { CategoriesService } from './categories.service';
import { InternalCategoriesController } from './internal-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [InternalCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
