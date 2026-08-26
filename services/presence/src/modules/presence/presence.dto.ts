import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  user_id!: string;

  @IsOptional()
  @IsIn(['visible', 'hidden'])
  visibility?: 'visible' | 'hidden';

  @IsOptional()
  @IsDateString()
  last_activity_at?: string;
}

export class BatchDto {
  @IsString({ each: true })
  user_ids!: string[];
}

export class VisibilityDto {
  @IsString()
  user_id!: string;

  @IsIn(['visible', 'hidden'])
  visibility!: 'visible' | 'hidden';
}
