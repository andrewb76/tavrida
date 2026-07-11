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

export class RegisterSettingKeyDto {
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

export class RegisterSettingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegisterSettingKeyDto)
  keys!: RegisterSettingKeyDto[];
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
