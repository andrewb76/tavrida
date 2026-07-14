import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { MarketplaceClient } from './marketplace.client';

const ACTIVE_LISTING_KEY = 'marketplace.seller.listing.activeMax';
const PORTFOLIO_KEY = 'marketplace.seller.portfolio.itemMax';
const ORDERS_MONTHLY_KEY = 'marketplace.buyer.order.monthlyMax';

class CreateListingBody {
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
  category?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

class UpdateListingBody {
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
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

class PortfolioBody {
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

class CreateOrderBody {
  @IsString()
  @MinLength(1)
  listingId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class OrderStatusBody {
  @IsIn(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'])
  status!: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
}

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceClient,
    private readonly planConfig: PlanConfigClient,
  ) {}

  @Get('listings')
  list(
    @Query('category') category?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.marketplace.listListings({ category, providerId, status: 'ACTIVE' });
  }

  @Get('listings/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @Query('viewerId') viewerId?: string) {
    return this.marketplace.getListing(id, viewerId);
  }

  @Get('my/listings')
  @UseGuards(JwtAuthGuard)
  myListings(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.marketplace.listListings({
      providerId: user.sub,
      mine: 'true',
      status,
    });
  }

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateListingBody) {
    if (body.status === 'ACTIVE') {
      await this.assertActiveListingLimit(user.sub);
    }
    return this.marketplace.createListing({
      providerId: user.sub,
      ...body,
    });
  }

  @Patch('listings/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateListingBody,
  ) {
    if (body.status === 'ACTIVE') {
      await this.assertActiveListingLimit(user.sub, id);
    }
    return this.marketplace.updateListing(id, { providerId: user.sub, ...body });
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.removeListing(id, user.sub);
  }

  @Post('listings/:id/portfolio')
  @UseGuards(JwtAuthGuard)
  async addPortfolio(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PortfolioBody,
  ) {
    const { count } = await this.marketplace.countPortfolio(id);
    const check = await this.planConfig.checkLimit({
      userId: user.sub,
      variableKey: PORTFOLIO_KEY,
      requestedValue: 1,
      currentUsage: count,
    });
    if (!check.allowed) {
      throw new ForbiddenException({
        message: 'Portfolio item limit reached',
        variableKey: PORTFOLIO_KEY,
        limit: check.limit,
      });
    }
    return this.marketplace.addPortfolio(id, { providerId: user.sub, ...body });
  }

  @Delete('listings/:id/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  removePortfolio(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.marketplace.removePortfolio(id, itemId, user.sub);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query('role') role: 'provider' | 'customer' = 'customer',
  ) {
    return this.marketplace.listOrders(user.sub, role);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@CurrentUser() user: AuthUser, @Body() body: CreateOrderBody) {
    const { count } = await this.marketplace.countOrdersMonthly(user.sub);
    const check = await this.planConfig.checkLimit({
      userId: user.sub,
      variableKey: ORDERS_MONTHLY_KEY,
      requestedValue: 1,
      currentUsage: count,
    });
    if (!check.allowed) {
      throw new ForbiddenException({
        message: 'Monthly order limit reached',
        variableKey: ORDERS_MONTHLY_KEY,
        limit: check.limit,
      });
    }
    return this.marketplace.createOrder({
      customerId: user.sub,
      listingId: body.listingId,
      note: body.note,
    });
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  updateOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderStatusBody,
  ) {
    return this.marketplace.updateOrderStatus(id, { userId: user.sub, status: body.status });
  }

  private async assertActiveListingLimit(userId: string, updatingId?: string) {
    const { count } = await this.marketplace.countActive(userId);
    // If activating an already-active listing, count already includes it — allow 0 requested bump.
    let usage = count;
    if (updatingId) {
      try {
        const current = (await this.marketplace.getListing(updatingId, userId)) as {
          status?: string;
        };
        if (current.status === 'ACTIVE') usage = Math.max(0, count - 1);
      } catch {
        /* ignore */
      }
    }
    const check = await this.planConfig.checkLimit({
      userId,
      variableKey: ACTIVE_LISTING_KEY,
      requestedValue: 1,
      currentUsage: usage,
    });
    if (!check.allowed) {
      throw new ForbiddenException({
        message: 'Active listing limit reached for your plan',
        variableKey: ACTIVE_LISTING_KEY,
        limit: check.limit,
        currentUsage: usage,
      });
    }
  }
}
