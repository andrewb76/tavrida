import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterScalarVariableDto {
  @IsString()
  key!: string;

  @IsString()
  type!: string;

  @Allow()
  default!: unknown;

  @IsString()
  service!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RegisterScalarVariablesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegisterScalarVariableDto)
  keys!: RegisterScalarVariableDto[];
}

export class SyncScalarVariablesDto {
  @IsString()
  service!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => RegisterScalarVariableDto)
  keys!: RegisterScalarVariableDto[];
}

export class PatchDomainSettingsDto {
  [key: string]: unknown;
}

/** club domain — admin UI (BFF registry). */
export class PatchClubSettingsDto {
  @IsOptional()
  @IsBoolean()
  'registration.inviteOnly'?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  'invite.validityDays'?: number;

  @IsOptional()
  @IsIn(['SINGLE_USE', 'MULTI_USE'])
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  'landing.publicSections'?: string[];
}
