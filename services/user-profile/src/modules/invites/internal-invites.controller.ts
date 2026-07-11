import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { IsEmail, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { InvitesService } from './invites.service';

class CreateInviteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  issuerId!: string;

  @IsString()
  logtoToken!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsISO8601()
  expiresAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}

class ClaimInviteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsOptional()
  @IsUUID()
  inviteCodeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  inviterId?: string;
}

@Controller('internal/v1/invites')
export class InternalInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  async create(@Body() body: CreateInviteDto) {
    const record = await this.invites.createInvite(body);
    return {
      id: record.id,
      code: record.code,
      issuerId: record.issuerId,
      email: record.email ?? undefined,
      expiresAt: record.expiresAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };
  }

  @Get()
  async list(
    @Query('issuerId') issuerId: string,
    @Query('limit') limit?: string,
  ) {
    const records = await this.invites.listByIssuer(issuerId, limit ? Number(limit) : 20);
    return {
      data: records.map((record) => ({
        id: record.id,
        code: record.code,
        email: record.email ?? undefined,
        usesCount: record.usesCount,
        maxUses: record.maxUses,
        expiresAt: record.expiresAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        status: this.invites.statusOf(record),
      })),
    };
  }

  @Get('resolve')
  resolve(
    @Query('code') code?: string,
    @Query('token') token?: string,
  ) {
    return this.invites.resolve({ code, token });
  }

  @Post('claim')
  claim(@Body() body: ClaimInviteDto) {
    return this.invites.claim(body);
  }
}
