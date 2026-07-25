import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { MediaUploadIntentEntity } from './media-upload-intent.entity';
import { MediaController } from './media.controller';
import { MediaLimitsService } from './media-limits.service';
import { MediaService } from './media.service';
import { MediaStorageService } from './media-storage.service';

@Module({
  imports: [AuthModule, PlanConfigModule, TypeOrmModule.forFeature([MediaUploadIntentEntity])],
  controllers: [MediaController],
  providers: [MediaService, MediaStorageService, MediaLimitsService],
  exports: [MediaLimitsService, MediaStorageService, MediaService],
})
export class MediaModule {}
