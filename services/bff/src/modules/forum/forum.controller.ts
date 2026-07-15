import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import {
  assertMarkdownMediaUrlsAllowed,
  assertMediaAttachmentsAllowed,
  type MediaAttachment,
} from '@tavrida/object-storage';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { MediaLimitsService } from '../media/media-limits.service';
import { MediaStorageService } from '../media/media-storage.service';
import { UserProfileClient } from '../user-profile/user-profile.client';
import { ForumClient } from './forum.client';
import { ForumAuthorsService } from './forum-authors.service';
import { forumVoteKarmaDelta } from './forum-vote-karma';
import { ForumSettingsReader } from '../scalar-config/forum-settings.reader';

class MediaAttachmentDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  filename!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

class CreateTopicDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class UpsertReactionDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: 'topic' | 'comment';

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emojiKey!: string;
}

class CastVoteDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: 'topic' | 'comment';

  @Type(() => Number)
  @IsInt()
  @IsIn([1, -1])
  value!: 1 | -1;
}

class ClearVoteDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: 'topic' | 'comment';
}

class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class PromoteCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title?: string;
}

class UpdateTopicTagsDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  tags!: string[];
}

@Controller('forum')
export class ForumController {
  private readonly logger = new Logger(ForumController.name);

  constructor(
    private readonly forum: ForumClient,
    private readonly authors: ForumAuthorsService,
    private readonly mediaLimits: MediaLimitsService,
    private readonly mediaStorage: MediaStorageService,
    private readonly forumSettings: ForumSettingsReader,
    private readonly profiles: UserProfileClient,
  ) {}

  private validateForumMedia(
    userId: string,
    body: string,
    attachments: MediaAttachment[] | undefined,
    limits: { countMax: number; sizeMaxBytes: number },
  ) {
    try {
      assertMediaAttachmentsAllowed({
        attachments: attachments ?? [],
        userId,
        domain: 'forum',
        publicBaseUrl: this.mediaStorage.publicBaseUrl(),
        maxCount: limits.countMax,
        maxSizeBytes: limits.sizeMaxBytes,
      });
      if (body.includes('![')) {
        assertMarkdownMediaUrlsAllowed({
          body,
          userId,
          domain: 'forum',
          publicBaseUrl: this.mediaStorage.publicBaseUrl(),
        });
      }
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'detail' in err && typeof err.detail === 'string'
          ? err.detail
          : 'Недопустимые вложения';
      throw new BadRequestException({ type: 'validation', detail });
    }
  }

  @Get('meta')
  async getMeta() {
    return {
      editWindowMinutes: await this.forumSettings.editWindowMinutes(),
      voteChangeWindowMinutes: await this.forumSettings.voteChangeWindowMinutes(),
    };
  }

  @Get('categories')
  listCategories() {
    return this.forum.listCategories();
  }

  @Get('topics')
  listTopics(@Query('categoryId') categoryId?: string, @Query('limit') limit?: string) {
    return this.forum.listTopics({
      categoryId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('topics/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getTopic(@Param('id') id: string, @Req() req: Request & { user?: AuthUser }) {
    const changeWindowMinutes = await this.forumSettings.voteChangeWindowMinutes();
    const topic = await this.forum.getTopic(id, {
      userId: req.user?.sub,
      changeWindowMinutes,
    });
    return this.authors.enrichOne(topic as { authorId: string });
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard)
  async createTopic(@CurrentUser() user: AuthUser, @Body() body: CreateTopicDto) {
    const limits = await this.mediaLimits.getLimits(user.sub, 'forum');
    this.validateForumMedia(user.sub, body.body, body.attachments, limits);
    return this.authors.enrichOne(
      await this.forum.createTopic({
        ...body,
        authorId: user.sub,
        maxAttachmentCount: limits.countMax,
        maxAttachmentSizeBytes: limits.sizeMaxBytes,
      }) as { authorId: string },
    );
  }

  @Patch('topics/:id')
  @UseGuards(JwtAuthGuard)
  async updateTopic(
    @CurrentUser() user: AuthUser,
    @Param('id') topicId: string,
    @Body() body: UpdateTopicDto,
  ) {
    const limits = await this.mediaLimits.getLimits(user.sub, 'forum');
    if (body.body) {
      this.validateForumMedia(user.sub, body.body, body.attachments, limits);
    }
    const editWindowMinutes = await this.forumSettings.editWindowMinutes();
    return this.authors.enrichOne(
      await this.forum.updateTopic(topicId, {
        ...body,
        authorId: user.sub,
        editWindowMinutes,
        maxAttachmentCount: limits.countMax,
        maxAttachmentSizeBytes: limits.sizeMaxBytes,
      }) as { authorId: string },
    );
  }

  @Get('topics/:id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  async listComments(@Param('id') topicId: string, @Req() req: Request & { user?: AuthUser }) {
    const changeWindowMinutes = await this.forumSettings.voteChangeWindowMinutes();
    const res = await this.forum.listComments(topicId, {
      userId: req.user?.sub,
      changeWindowMinutes,
    });
    const data = await this.authors.enrichMany(res.data as Array<{ authorId: string }>);
    return { data };
  }

  @Post('topics/:id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @CurrentUser() user: AuthUser,
    @Param('id') topicId: string,
    @Body() body: CreateCommentDto,
  ) {
    const limits = await this.mediaLimits.getLimits(user.sub, 'forum');
    this.validateForumMedia(user.sub, body.body, body.attachments, limits);
    return this.authors.enrichOne(
      await this.forum.createComment(topicId, {
        ...body,
        authorId: user.sub,
        maxAttachmentCount: limits.countMax,
        maxAttachmentSizeBytes: limits.sizeMaxBytes,
      }) as { authorId: string },
    );
  }

  @Patch('topics/:topicId/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @CurrentUser() user: AuthUser,
    @Param('topicId') topicId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
  ) {
    const limits = await this.mediaLimits.getLimits(user.sub, 'forum');
    if (body.body) {
      this.validateForumMedia(user.sub, body.body, body.attachments, limits);
    }
    const editWindowMinutes = await this.forumSettings.editWindowMinutes();
    return this.authors.enrichOne(
      await this.forum.updateComment(topicId, commentId, {
        ...body,
        authorId: user.sub,
        editWindowMinutes,
        maxAttachmentCount: limits.countMax,
        maxAttachmentSizeBytes: limits.sizeMaxBytes,
      }) as { authorId: string },
    );
  }

  @Post('topics/:topicId/comments/:commentId/promote-to-topic')
  @UseGuards(JwtAuthGuard)
  promoteComment(
    @CurrentUser() user: AuthUser,
    @Param('topicId') topicId: string,
    @Param('commentId') commentId: string,
    @Body() body: PromoteCommentDto,
  ) {
    return this.forum.promoteCommentToTopic(topicId, commentId, {
      actorId: user.sub,
      title: body.title,
    });
  }

  @Put('topics/:id/tags')
  @UseGuards(JwtAuthGuard)
  async updateTopicTags(
    @CurrentUser() user: AuthUser,
    @Param('id') topicId: string,
    @Body() body: UpdateTopicTagsDto,
  ) {
    return this.authors.enrichOne(
      (await this.forum.updateTopicTags(topicId, {
        authorId: user.sub,
        tags: body.tags,
      })) as { authorId: string },
    );
  }

  @Get('reactions')
  listReactions(
    @Query('contentId') contentId: string,
    @Query('contentType') contentType: 'topic' | 'comment',
  ) {
    return this.forum.listReactions(contentId, contentType);
  }

  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  upsertReaction(@CurrentUser() user: AuthUser, @Body() body: UpsertReactionDto) {
    return this.forum.upsertReaction({ ...body, userId: user.sub });
  }

  @Post('votes')
  @UseGuards(JwtAuthGuard)
  async castVote(@CurrentUser() user: AuthUser, @Body() body: CastVoteDto) {
    const changeWindowMinutes = await this.forumSettings.voteChangeWindowMinutes();
    const result = (await this.forum.castVote({
      ...body,
      userId: user.sub,
      changeWindowMinutes,
    })) as {
      contentId: string;
      contentType: 'topic' | 'comment';
      authorId: string;
      previousValue: 1 | -1 | null;
      myVote: 1 | -1 | null;
      plusCount: number;
      minusCount: number;
      score: number;
      canChange: boolean;
    };

    await this.applyForumVoteKarma({
      authorId: result.authorId,
      actorId: user.sub,
      contentId: result.contentId,
      contentType: result.contentType,
      previousVote: result.previousValue,
      nextVote: result.myVote,
    });

    return result;
  }

  @Post('votes/clear')
  @UseGuards(JwtAuthGuard)
  async clearVote(@CurrentUser() user: AuthUser, @Body() body: ClearVoteDto) {
    const changeWindowMinutes = await this.forumSettings.voteChangeWindowMinutes();
    const result = (await this.forum.clearVote({
      ...body,
      userId: user.sub,
      changeWindowMinutes,
    })) as {
      contentId: string;
      contentType: 'topic' | 'comment';
      authorId: string;
      previousValue: 1 | -1 | null;
      myVote: 1 | -1 | null;
      plusCount: number;
      minusCount: number;
      score: number;
      canChange: boolean;
    };

    await this.applyForumVoteKarma({
      authorId: result.authorId,
      actorId: user.sub,
      contentId: result.contentId,
      contentType: result.contentType,
      previousVote: result.previousValue,
      nextVote: null,
    });

    return result;
  }

  private async applyForumVoteKarma(input: {
    authorId: string;
    actorId: string;
    contentId: string;
    contentType: 'topic' | 'comment';
    previousVote: 1 | -1 | null;
    nextVote: 1 | -1 | null;
  }) {
    const weights = await this.forumSettings.voteKarmaWeights();
    const karmaDelta = forumVoteKarmaDelta(
      input.previousVote,
      input.nextVote,
      weights.plus,
      weights.minus,
    );
    if (Math.abs(karmaDelta) < 1e-9) return;

    try {
      await this.profiles.adjustRating(input.authorId, {
        karmaDelta,
        actorId: input.actorId,
        source: 'FORUM_VOTE',
        referenceId: input.contentId,
        note: `${input.contentType} vote ${input.previousVote ?? 0}→${input.nextVote ?? 0}`,
      });
    } catch (error) {
      this.logger.warn(
        `forum vote karma adjust failed for ${input.authorId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
