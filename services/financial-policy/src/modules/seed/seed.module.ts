import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanParameterEntity } from '../../entities/plan-parameter.entity';
import { PlanEntity } from '../../entities/plan.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity, ParameterEntity, PlanParameterEntity])],
  providers: [SeedService],
})
export class SeedModule {}
