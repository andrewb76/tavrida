import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGroupMemberEntity } from '../../entities/access-group-member.entity';
import { AccessGroupEntity } from '../../entities/access-group.entity';
import { CategoryAccessGroupEntity } from '../../entities/category-access-group.entity';
import { CategoryEntity } from '../../entities/category.entity';
import { AccessGroupsService } from './access-groups.service';
import { InternalAccessGroupsController } from './internal-access-groups.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccessGroupEntity,
      AccessGroupMemberEntity,
      CategoryAccessGroupEntity,
      CategoryEntity,
    ]),
  ],
  controllers: [InternalAccessGroupsController],
  providers: [AccessGroupsService],
  exports: [AccessGroupsService],
})
export class AccessGroupsModule {}
