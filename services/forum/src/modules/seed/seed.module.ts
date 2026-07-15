import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TagEntity } from '../../entities/tag.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, TagEntity])],
  providers: [SeedService],
})
export class SeedModule {}
