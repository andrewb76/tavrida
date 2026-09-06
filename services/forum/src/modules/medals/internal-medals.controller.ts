import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength, IsUUID } from 'class-validator';
import { MedalsService } from './medals.service';

class AwardMedalDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsUUID()
  medalId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  awardedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string;
}

@Controller('internal/v1/medals')
export class InternalMedalsController {
  constructor(private readonly medals: MedalsService) {}

  @Get()
  listAll() {
    return this.medals.listAll();
  }

  @Get(':userId')
  listUserMedals(@Param('userId') userId: string) {
    return this.medals.listUserMedals(userId);
  }

  @Post(':userId')
  award(@Param('userId') userId: string, @Body() body: AwardMedalDto) {
    return this.medals.award({ ...body, userId });
  }

  @Delete(':userId/:medalId')
  revoke(@Param('userId') userId: string, @Param('medalId') medalId: string) {
    return this.medals.revoke(userId, medalId);
  }
}
