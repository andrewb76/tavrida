import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParameterEntity } from '../../entities/parameter.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';
import { SystemValueController } from './system-value.controller';
import { SystemValueService } from './system-value.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemValueEntity, ParameterEntity])],
  controllers: [SystemValueController],
  providers: [SystemValueService],
  exports: [SystemValueService],
})
export class SystemValueModule {}
