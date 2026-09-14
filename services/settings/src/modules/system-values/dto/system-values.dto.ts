import { Allow, IsOptional, IsString } from 'class-validator';

export class UpdateSystemValueDto {
  @Allow()
  value!: unknown;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
