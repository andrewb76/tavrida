import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ClaimInviteDto {
  @IsOptional()
  @IsUUID()
  inviteCodeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  inviterId?: string;
}
