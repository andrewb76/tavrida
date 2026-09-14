import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterParameterDto {
  @IsString()
  key!: string;

  @IsString()
  service!: string;

  @IsIn(['system-var', 'tarif-var', 'limited-user-var', 'user-var'])
  category!: 'system-var' | 'tarif-var' | 'limited-user-var' | 'user-var';

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  paramType!: string;

  @Allow()
  defaultValue!: unknown;

  @IsOptional()
  @IsBoolean()
  userOverride?: boolean;

  @IsOptional()
  @IsString()
  sortOrder?: number;

  @IsOptional()
  @Allow()
  planValues?: Record<string, unknown>;
}

export class SyncParametersDto {
  @IsString()
  service!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => RegisterParameterDto)
  parameters!: RegisterParameterDto[];
}

export class UpdateParameterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  paramType?: string;

  @IsOptional()
  @Allow()
  defaultValue?: unknown;

  @IsOptional()
  @IsBoolean()
  userOverride?: boolean;

  @IsOptional()
  @IsString()
  sortOrder?: number;
}
