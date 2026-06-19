import { Controller, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { ShipDealDto, LeaveReviewDto } from './dto/deal-actions.dto';
import { Deal } from './entities/deal.entity';
import { ReputationHistory } from '../reputation/entities/reputation-history.entity';

@ApiTags('Управление сделками (Deals & Workflow)')
@ApiBearerAuth()
@Controller('api/deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post(':id/confirm-payment')
  @ApiOperation({ summary: 'Продавец: подтвердить получение оплаты напрямую' })
  @ApiResponse({ status: 200, type: Deal })
  async confirmPayment(@Param('id', ParseUUIDPipe) id: string) {
    const mockLogtoSellerId = 'test-seller-uuid'; // В проде вытаскиваем из req.user.sub
    return await this.dealsService.confirmPayment(id, mockLogtoSellerId);
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Продавец: отправить посылку и ввести почтовый трек-номер' })
  @ApiResponse({ status: 200, type: Deal })
  async shipItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipDealDto) {
    const mockLogtoSellerId = 'test-seller-uuid';
    return await this.dealsService.shipItem(id, dto, mockLogtoSellerId);
  }

  @Post(':id/confirm-delivery')
  @ApiOperation({ summary: 'Покупатель: подтвердить успешное получение посылки товара' })
  @ApiResponse({ status: 200, type: Deal })
  async confirmDelivery(@Param('id', ParseUUIDPipe) id: string) {
    const mockLogtoBuyerId = 'test-buyer-uuid';
    return await this.dealsService.confirmDelivery(id, mockLogtoBuyerId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Оставить отзыв участнику сделки и обновить его рейтинг' })
  @ApiResponse({ status: 201, type: ReputationHistory })
  async leaveReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LeaveReviewDto) {
    const mockLogtoUserId = 'test-buyer-uuid'; // Тот, кто вызывает метод в данный момент
    return await this.dealsService.leaveReview(id, dto, mockLogtoUserId);
  }
}
