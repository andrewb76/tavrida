// apps/config-service/src/config/config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './entities/config.entity';
import { ConfigService } from './config.service';
import { AdminConfigController } from './admin-config.controller';
import { InternalConfigController } from './internal-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Config])],
  providers: [ConfigService],
  controllers: [AdminConfigController, InternalConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
