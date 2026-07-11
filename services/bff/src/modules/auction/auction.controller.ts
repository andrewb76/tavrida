import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
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
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { AuctionClient } from './auction.client';
import { applySearchPolicy, resolveSearchScope } from './auction-search-policy';
import {
  applySellerCreatePolicy,
  dailyLimitSummary,
  resolveSellerPlanOptions,
} from './auction-seller-policy';

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

@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionController {
  constructor(
    private readonly auction: AuctionClient,
    private readonly planConfig: PlanConfigClient,
  ) {}

  private async resolvePlanId(userId: string) {
    try {
      const sub = await this.planConfig.getSubscription(userId);
      return sub.planId ?? 'free';
    } catch {
      return 'free';
    }
  }

  @Get('create-options')
  async createOptions(@CurrentUser() user: AuthUser) {
    const planId = await this.resolvePlanId(user.sub);
    const options = resolveSellerPlanOptions(planId);
    const meta = await this.auction.getSellerMeta(user.sub);
    return {
      ...options,
      dailyLimit: dailyLimitSummary(options, meta.lotsCreatedToday),
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateAuctionDto) {
    const planId = await this.resolvePlanId(user.sub);
    const options = resolveSellerPlanOptions(planId);
    const meta = await this.auction.getSellerMeta(user.sub);
    const payload = applySellerCreatePolicy(body, options, meta.lotsCreatedToday);
    return this.auction.createAuction({ ...payload, sellerId: user.sub });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListAuctionsQuery) {
    const planId = await this.resolvePlanId(user.sub);
    const scope = resolveSearchScope(planId);
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

  @Get(':id/expert-appraisals')
  listExpertAppraisals(@Param('id') id: string) {
    return this.auction.listExpertAppraisals(id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auction.getAuction(id);
  }
}
