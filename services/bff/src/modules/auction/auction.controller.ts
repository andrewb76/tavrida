import { BadRequestException, Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { assertMediaUrlsAllowed } from '@tavrida/object-storage';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaLimitsService } from '../media/media-limits.service';
import { MediaStorageService } from '../media/media-storage.service';
import { AuctionClient } from './auction.client';
import { AuctionPlanPolicyService } from './auction-plan-policy.service';
import { applySearchPolicy } from './auction-search-policy';
import { applySellerCreatePolicy } from './auction-seller-policy';

class ListAuctionsQuery {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'ENDING_SOON', 'SCHEDULED', 'ENDED', 'ALL'])
  status?: string;

  @IsOptional()
  @IsIn(['ENDING_SOON', 'NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'RELEVANCE', 'PROMOTED'])
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['ENGLISH', 'DUTCH'])
  type?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasExpertAppraisal?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

class CreateAuctionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(256)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  description!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsIn(['ENGLISH', 'DUTCH'])
  type!: 'ENGLISH' | 'DUTCH';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startingPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bidIncrement!: number;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  images?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reservePrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  promote?: boolean;
}

class PlaceBidDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionController {
  constructor(
    private readonly auction: AuctionClient,
    private readonly auctionPlanPolicy: AuctionPlanPolicyService,
    private readonly mediaLimits: MediaLimitsService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  @Get('create-options')
  async createOptions(@CurrentUser() user: AuthUser) {
    const meta = await this.auction.getSellerMeta(user.sub);
    const resolved = await this.auctionPlanPolicy.resolveSellerPlanOptions(
      user.sub,
      meta.lotsCreatedToday,
    );
    const { dailyLimitSummary, ...options } = resolved;
    const imageLimits = await this.mediaLimits.getLimits(user.sub, 'auction');
    return {
      ...options,
      dailyLimit: dailyLimitSummary,
      imageLimits,
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateAuctionDto) {
    const meta = await this.auction.getSellerMeta(user.sub);
    const resolved = await this.auctionPlanPolicy.resolveSellerPlanOptions(
      user.sub,
      meta.lotsCreatedToday,
    );
    const { dailyLimitSummary: _dailyLimitSummary, ...options } = resolved;
    const payload = applySellerCreatePolicy(body, options, meta.lotsCreatedToday);
    const imageLimits = await this.mediaLimits.getLimits(user.sub, 'auction');

    if (payload.images?.length) {
      try {
        assertMediaUrlsAllowed({
          urls: payload.images,
          userId: user.sub,
          domain: 'auction',
          publicBaseUrl: this.mediaStorage.publicBaseUrl(),
          maxCount: imageLimits.countMax,
        });
      } catch (err) {
        const detail =
          err && typeof err === 'object' && 'detail' in err && typeof err.detail === 'string'
            ? err.detail
            : 'Недопустимые URL изображений';
        throw new BadRequestException({ type: 'validation', detail });
      }
    }

    return this.auction.createAuction({
      ...payload,
      sellerId: user.sub,
      maxImageCount: imageLimits.countMax,
      mediaPublicBaseUrl: this.mediaStorage.publicBaseUrl(),
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListAuctionsQuery) {
    const scope = await this.auctionPlanPolicy.resolveSearchScope(user.sub);
    const policy = applySearchPolicy(query, scope);
    const result = await this.auction.listAuctions({
      ...policy.query,
      searchMode: policy.searchMode,
    });

    return {
      ...result,
      meta: {
        ...result.meta,
        searchScope: policy.searchScope,
      },
    };
  }

  @Get(':id/bids')
  listBids(@Param('id') id: string) {
    return this.auction.listBids(id);
  }

  @Post(':id/bids')
  placeBid(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PlaceBidDto) {
    return this.auction.placeBid(id, { bidderId: user.sub, amount: body.amount });
  }

  @Get(':id/expert-appraisals')
  listExpertAppraisals(@Param('id') id: string) {
    return this.auction.listExpertAppraisals(id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auction.getAuction(id);
  }
}
