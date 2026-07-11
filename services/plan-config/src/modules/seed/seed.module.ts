import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanVariableEntity } from '../../entities/plan-variable.entity';
import { PlanVariableTierEntity } from '../../entities/plan-variable-tier.entity';
import { PlanEntity } from '../../entities/plan.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanEntity, PlanVariableEntity, PlanVariableTierEntity]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
