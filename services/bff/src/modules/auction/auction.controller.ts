import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionController {
  constructor(
    private readonly auction: AuctionClient,
    private readonly planConfig: PlanConfigClient,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListAuctionsQuery) {
    let planId = 'free';
    try {
      const sub = await this.planConfig.getSubscription(user.sub);
      planId = sub.planId ?? 'free';
    } catch {
      planId = 'free';
    }

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
}
