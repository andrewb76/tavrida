// src/config/dto/update-config.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  value?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  value_description?: string;
}
