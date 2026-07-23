import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { AccessGroupsModule } from '../access-groups/access-groups.module';
import { CategoriesService } from './categories.service';
import { InternalCategoriesController } from './internal-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, TopicEntity]), AccessGroupsModule],
  controllers: [InternalCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
