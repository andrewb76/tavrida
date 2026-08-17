import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { createHash } from 'node:crypto';
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
import { BillingClient } from '../billing/billing.client';
import { KetoService } from '../keto/keto.service';
import { MediaLimitsService } from '../media/media-limits.service';
import { MediaStorageService } from '../media/media-storage.service';
import { UserProfileClient } from '../user-profile/user-profile.client';
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

class CreateExpertAppraisalDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  summary!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValueMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValueMax?: number;
}

@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionController {
  constructor(
    private readonly auction: AuctionClient,
    private readonly auctionPlanPolicy: AuctionPlanPolicyService,
    private readonly mediaLimits: MediaLimitsService,
    private readonly mediaStorage: MediaStorageService,
    private readonly billing: BillingClient,
    private readonly keto: KetoService,
    private readonly profiles: UserProfileClient,
  ) {}

  @Get('create-options')
  async createOptions(@CurrentUser() user: AuthUser) {
    const meta = await this.auction.getSellerMeta(user.sub);
    const resolved = await this.auctionPlanPolicy.resolveSellerPlanOptionsForDisplay(
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
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAuctionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const meta = await this.auction.getSellerMeta(user.sub);
    const resolved = await this.auctionPlanPolicy.resolveSellerPlanOptions(
      user.sub,
      meta.lotsCreatedToday,
    );
    const payload = applySellerCreatePolicy(body, resolved, meta.lotsCreatedToday);
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

    const charges = [
      ...(payload.promote
        ? [
            {
              amount: resolved.promotionUnitPrice,
              target: 'auction.promotion',
              description: 'Продвижение лота',
              suffix: 'promotion',
            },
          ]
        : []),
      ...(payload.reservePrice != null
        ? [
            {
              amount: resolved.reserveUnitPrice,
              target: 'auction.reservePrice',
              description: 'Резервная цена лота',
              suffix: 'reserve',
            },
          ]
        : []),
    ];
    const requestKey = idempotencyKey?.trim();
    if (charges.length && (!requestKey || requestKey.length > 80)) {
      throw new BadRequestException({
        type: 'idempotency_key_required',
        detail: 'Для платных опций требуется Idempotency-Key (до 80 символов)',
      });
    }
    const chargeKey = requestKey
      ? createHash('sha256').update(`${user.sub}:${requestKey}`).digest('hex').slice(0, 32)
      : '';
    for (const charge of charges) {
      await this.billing.charge({
        userId: user.sub,
        amount: charge.amount,
        target: charge.target,
        description: charge.description,
        idempotencyKey: `auction.create:${chargeKey}:${charge.suffix}`,
      });
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
  async listBids(@Param('id') id: string) {
    const { data } = await this.auction.listBids(id);
    const bidderIds = [...new Set(data.map((b) => b.bidderId))];
    const profileMap = new Map<string, string | null>();
    await Promise.allSettled(
      bidderIds.map(async (uid) => {
        try {
          const p = await this.profiles.getPublicProfile(uid);
          profileMap.set(uid, p.displayName || p.username || null);
        } catch {
          profileMap.set(uid, null);
        }
      }),
    );
    return {
      data: data.map((b) => ({
        ...b,
        bidderDisplayName: profileMap.get(b.bidderId) ?? null,
      })),
    };
  }

  @Post(':id/bids')
  placeBid(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PlaceBidDto) {
    return this.auction.placeBid(id, { bidderId: user.sub, amount: body.amount });
  }

  @Post(':id/promote')
  async promote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const lot = await this.auction.getAuction(id);
    const sellerId = typeof lot.sellerId === 'string' ? lot.sellerId : '';
    const isAdmin = await this.keto.isPlatformAdmin(user.sub);
    if (sellerId !== user.sub && !isAdmin) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Продвижение доступно только продавцу лота',
      });
    }

    const meta = await this.auction.getSellerMeta(user.sub);
    const resolved = await this.auctionPlanPolicy.resolveSellerPlanOptions(
      user.sub,
      meta.lotsCreatedToday,
    );
    if (!resolved.promotionEnabled) {
      throw new ForbiddenException({
        type: 'feature_not_available',
        detail: 'Продвижение недоступно на текущем тарифе',
      });
    }

    const requestKey = idempotencyKey?.trim();
    if (!requestKey || requestKey.length > 80) {
      throw new BadRequestException({
        type: 'idempotency_key_required',
        detail: 'Для платных опций требуется Idempotency-Key (до 80 символов)',
      });
    }
    const chargeKey = createHash('sha256').update(`${user.sub}:${requestKey}`).digest('hex');
    await this.billing.charge({
      userId: user.sub,
      amount: resolved.promotionUnitPrice,
      target: 'auction.promotion',
      description: 'Продвижение лота',
      idempotencyKey: `auction.promote:${chargeKey}`,
    });

    return this.auction.promoteAuction(id);
  }

  @Get(':id/expert-appraisals')
  listExpertAppraisals(@Param('id') id: string) {
    return this.auction.listExpertAppraisals(id);
  }

  @Post(':id/expert-appraisals')
  async createExpertAppraisal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateExpertAppraisalDto,
  ) {
    const isExpert = await this.keto.isPlatformExpert(user.sub);
    if (!isExpert) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Экспертиза доступна только экспертам',
      });
    }

    const lot = await this.auction.getAuction(id);
    const sellerId = typeof lot.sellerId === 'string' ? lot.sellerId : '';
    if (sellerId === user.sub) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нельзя оценить собственный лот',
      });
    }

    return this.auction.createExpertAppraisal(id, {
      expertId: user.sub,
      summary: body.summary,
      estimatedValueMin: body.estimatedValueMin,
      estimatedValueMax: body.estimatedValueMax,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auction.getAuction(id);
  }
}
