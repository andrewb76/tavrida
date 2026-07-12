import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUploadIntentDto, MediaLimitsQuery } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('limits')
  getLimits(@CurrentUser() user: AuthUser, @Query() query: MediaLimitsQuery) {
    return this.media.getLimits(user.sub, query.domain);
  }

  @Post('upload-intents')
  createUploadIntent(@CurrentUser() user: AuthUser, @Body() body: CreateUploadIntentDto) {
    return this.media.createUploadIntent(user.sub, body);
  }

  @Post('upload-intents/:id/confirm')
  confirmUploadIntent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) uploadId: string,
  ) {
    return this.media.confirmUploadIntent(user.sub, uploadId);
  }

  @Delete('upload-intents/:id')
  cancelUploadIntent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) uploadId: string,
  ) {
    return this.media.cancelUploadIntent(user.sub, uploadId);
  }
}
