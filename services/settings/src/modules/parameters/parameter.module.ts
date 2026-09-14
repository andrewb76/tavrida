import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { ParameterController } from './parameter.controller';
import { ParameterService } from './parameter.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParameterEntity, PlanValueEntity])],
  controllers: [ParameterController],
  providers: [ParameterService],
  exports: [ParameterService],
})
export class ParameterModule {}
