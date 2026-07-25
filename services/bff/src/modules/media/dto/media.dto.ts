import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { MediaDomain } from '@tavrida/object-storage';

export class CreateUploadIntentDto {
  @IsIn(['auction', 'forum', 'marketplace', 'chat'])
  domain!: MediaDomain;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  filename!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(128)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes!: number;
}

export class MediaLimitsQuery {
  @IsIn(['auction', 'forum', 'marketplace', 'chat'])
  domain!: MediaDomain;
}
