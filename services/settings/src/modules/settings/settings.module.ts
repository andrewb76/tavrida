import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingEntity } from '../../entities/setting.entity';
import { SettingKeyEntity } from '../../entities/setting-key.entity';
import { InternalSettingsController } from './internal-settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity, SettingKeyEntity])],
  controllers: [InternalSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
