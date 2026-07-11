import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanParameterEntity } from '../../entities/plan-parameter.entity';
import { InternalParametersController } from './internal-parameters.controller';
import { ParametersService } from './parameters.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParameterEntity, PlanParameterEntity])],
  controllers: [InternalParametersController],
  providers: [ParametersService],
  exports: [ParametersService],
})
export class ParametersModule {}
