import { Body, Controller, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ParametersService } from './parameters.service';

class PlanValueDto {
  @IsOptional()
  @IsInt()
  limitValue?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatureEnabled?: boolean;

  @IsOptional()
  enumValues?: string[] | null;
}

class RegisterParameterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  service!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['limit', 'feature', 'enum'])
  valueType!: 'limit' | 'feature' | 'enum';

  @IsOptional()
  @IsInt()
  minValue?: number | null;

  @IsOptional()
  @IsInt()
  defaultValue?: number | null;

  @IsOptional()
  @IsInt()
  maxValue?: number | null;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => PlanValueDto)
  planValues?: Record<string, PlanValueDto>;
}

class SetLimitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  planId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  parameterKey!: string;

  @IsOptional()
  @IsInt()
  limitValue?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatureEnabled?: boolean;

  @IsOptional()
  enumValues?: string[] | null;
}

@Controller('internal/v1/parameters')
export class InternalParametersController {
  constructor(private readonly parameters: ParametersService) {}

  @Post('register')
  register(@Body() body: RegisterParameterDto) {
    return this.parameters.register(body);
  }

  @Post('set-limit')
  setLimit(@Body() body: SetLimitDto) {
    return this.parameters.setLimit(body.planId, body.parameterKey, body);
  }
}
