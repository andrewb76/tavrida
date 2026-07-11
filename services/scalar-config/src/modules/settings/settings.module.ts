import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScalarValueEntity } from '../../entities/scalar-value.entity';
import { ScalarVariableEntity } from '../../entities/scalar-variable.entity';
import { InternalSettingsController } from './internal-settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScalarValueEntity, ScalarVariableEntity])],
  controllers: [InternalSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
