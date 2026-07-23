import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryAllowedUserEntity } from '../../entities/category-allowed-user.entity';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { CategoriesService } from './categories.service';
import { InternalCategoriesController } from './internal-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, TopicEntity, CategoryAllowedUserEntity])],
  controllers: [InternalCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
