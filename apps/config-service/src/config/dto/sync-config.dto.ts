// apps/config-service/src/config/dto/sync-config.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SyncConfigDto {
  @ApiProperty({ description: 'Объект с ключами и дефолтными значениями' })
  @IsObject()
  defaults: Record<string, any>;
}