import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
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
import type { AuctionType } from '../../entities/auction.entity';
import { AuctionsService } from './auctions.service';
import type { CatalogSort, CatalogStatus, SearchMode } from './auction-list.logic';

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
  status?: CatalogStatus;

  @IsOptional()
  @IsIn(['ENDING_SOON', 'NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'RELEVANCE', 'PROMOTED'])
  sort?: CatalogSort;

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
  type?: 'ENGLISH' | 'DUTCH';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasExpertAppraisal?: boolean;

  @IsOptional()
  @IsIn(['TITLE', 'FULL_TEXT'])
  searchMode?: SearchMode;

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
  @MinLength(1)
  sellerId!: string;

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
  type!: AuctionType;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDurationHours?: number | null;

  @IsOptional()
  @IsIn(['ENGLISH', 'DUTCH'], { each: true })
  allowedTypes?: AuctionType[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxImageCount?: number;

  @IsOptional()
  @IsString()
  mediaPublicBaseUrl?: string;
}

class PlaceBidDto {
  @IsString()
  @MinLength(1)
  bidderId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

class CreateExpertAppraisalDto {
  @IsString()
  @MinLength(1)
  expertId!: string;

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

@Controller('internal/v1/auctions')
export class InternalAuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Get('meta/seller')
  sellerMeta(@Query('sellerId') sellerId: string) {
    return this.auctions.countSellerLotsToday(sellerId);
  }

  @Post('close/run')
  closeRun() {
    return this.auctions.runCloseDue();
  }

  @Post()
  create(@Body() body: CreateAuctionDto) {
    return this.auctions.create(body);
  }

  @Get()
  list(@Query() query: ListAuctionsQuery) {
    return this.auctions.list(query);
  }

  @Post(':id/bids')
  placeBid(@Param('id') id: string, @Body() body: PlaceBidDto) {
    return this.auctions.placeBid({
      auctionId: id,
      bidderId: body.bidderId,
      amount: body.amount,
    });
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.auctions.closeAuction(id);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string) {
    return this.auctions.promote(id);
  }

  @Get(':id/bids')
  listBids(@Param('id') id: string) {
    return this.auctions.listBids(id);
  }

  @Get(':id/expert-appraisals')
  listExpertAppraisals(@Param('id') id: string) {
    return this.auctions.listExpertAppraisals(id);
  }

  @Post(':id/expert-appraisals')
  createExpertAppraisal(@Param('id') id: string, @Body() body: CreateExpertAppraisalDto) {
    return this.auctions.createExpertAppraisal({
      auctionId: id,
      expertId: body.expertId,
      summary: body.summary,
      estimatedValueMin: body.estimatedValueMin,
      estimatedValueMax: body.estimatedValueMax,
    });
  }

  @Post(':id/views')
  async recordView(@Param('id') id: string, @Body('userId') userId: string) {
    await this.auctions.recordView(id, userId);
    return { ok: true };
  }

  @Get(':id/views')
  async getViews(@Param('id') id: string) {
    const count = await this.auctions.getLotViewCount(id);
    return { count };
  }

  @Get(':id/viewers')
  async getViewers(@Param('id') id: string) {
    const data = await this.auctions.getLotViewers(id);
    return { data };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auctions.getById(id);
  }
}
