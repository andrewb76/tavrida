import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  ORDER_STATUSES,
} from '../../common/marketplace.types';
import { ListingsService } from '../listings/listings.service';
import { OrdersService } from '../orders/orders.service';

class CreateListingDto {
  @IsString()
  @MinLength(1)
  providerId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn([...LISTING_CATEGORIES])
  category?: (typeof LISTING_CATEGORIES)[number];

  @IsOptional()
  @IsIn([...LISTING_STATUSES])
  status?: (typeof LISTING_STATUSES)[number];
}

class UpdateListingDto {
  @IsString()
  @MinLength(1)
  providerId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn([...LISTING_CATEGORIES])
  category?: (typeof LISTING_CATEGORIES)[number] | null;

  @IsOptional()
  @IsIn([...LISTING_STATUSES])
  status?: (typeof LISTING_STATUSES)[number];
}

class ProviderQueryDto {
  @IsString()
  @MinLength(1)
  providerId!: string;
}

class PortfolioDto {
  @IsString()
  @MinLength(1)
  providerId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  imageUrl!: string;
}

class CreateOrderDto {
  @IsString()
  @MinLength(1)
  customerId!: string;

  @IsString()
  @MinLength(1)
  listingId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateOrderStatusDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsIn([...ORDER_STATUSES])
  status!: (typeof ORDER_STATUSES)[number];
}

@Controller('internal/v1/marketplace')
export class InternalMarketplaceController {
  constructor(
    private readonly listings: ListingsService,
    private readonly orders: OrdersService,
  ) {}

  @Get('limit-keys')
  limitKeys() {
    return this.listings.limitKeys();
  }

  @Get('listings/count-active')
  countActive(@Query('providerId') providerId: string) {
    return this.listings.countActiveByProvider(providerId).then((count) => ({ count }));
  }

  @Get('listings')
  listListings(
    @Query('category') category?: string,
    @Query('providerId') providerId?: string,
    @Query('status') status?: (typeof LISTING_STATUSES)[number],
    @Query('mine') mine?: string,
  ) {
    return this.listings.list({
      category,
      providerId: mine === 'true' ? undefined : providerId,
      status,
      mineProviderId: mine === 'true' ? providerId : undefined,
    });
  }

  @Get('listings/:id')
  getListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('viewerId') viewerId?: string,
  ) {
    return this.listings.get(id, { includeDraftFor: viewerId });
  }

  @Post('listings')
  createListing(@Body() body: CreateListingDto) {
    return this.listings.create(body);
  }

  @Patch('listings/:id')
  updateListing(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateListingDto) {
    return this.listings.update(id, body.providerId, body);
  }

  @Delete('listings/:id')
  removeListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ProviderQueryDto,
  ) {
    return this.listings.remove(id, query.providerId);
  }

  @Get('listings/:id/portfolio/count')
  countPortfolio(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.countPortfolio(id).then((count) => ({ count }));
  }

  @Post('listings/:id/portfolio')
  addPortfolio(@Param('id', ParseUUIDPipe) id: string, @Body() body: PortfolioDto) {
    return this.listings.addPortfolio(id, body.providerId, body);
  }

  @Delete('listings/:id/portfolio/:itemId')
  removePortfolio(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: ProviderQueryDto,
  ) {
    return this.listings.removePortfolio(id, itemId, query.providerId);
  }

  @Get('orders/count-monthly')
  countMonthly(@Query('customerId') customerId: string) {
    return this.orders.countCustomerOrdersThisMonth(customerId).then((count) => ({ count }));
  }

  @Get('orders')
  listOrders(
    @Query('userId') userId: string,
    @Query('role') role: 'provider' | 'customer' = 'customer',
  ) {
    return this.orders.list(userId, role);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string, @Query('userId') userId: string) {
    return this.orders.get(id, userId);
  }

  @Post('orders')
  createOrder(@Body() body: CreateOrderDto) {
    return this.orders.create(body);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, body.userId, body.status);
  }
}
