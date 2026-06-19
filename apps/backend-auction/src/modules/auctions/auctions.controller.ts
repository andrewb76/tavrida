import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { CreateEnglishAuctionDto } from './dto/create-english-auction.dto';
import { CreateDutchAuctionDto } from './dto/create-dutch-auction.dto';
import { Auction } from './entities/auction.entity';

@ApiTags('Аукционы (Auctions)')
@ApiBearerAuth()
@Controller('api/auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post('english')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать новый английский аукцион', description: 'Создает лот, привязывает его к ветке категорий и генерирует конфигурацию стратегии торгов.' })
  @ApiResponse({ status: 201, description: 'Аукцион успешно создан.', type: Auction })
  @ApiResponse({ status: 400, description: 'Ошибка валидации дат или параметров цены.' })
  async createEnglish(@Body() dto: CreateEnglishAuctionDto) {
    const mockLogtoUserId = 'test-logto-uuid-12345'; // Фолбэк до подключения гварда Logto
    return await this.auctionsService.createEnglishAuction(dto, mockLogtoUserId);
  }
  
  @Post('dutch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Создать новый голландский аукцион (на понижение)', 
    description: 'Создает лот с логикой автоматического снижения цены по прошествии интервалов времени. Выкупается первой валидной ставкой.' 
  })
  @ApiResponse({ status: 201, description: 'Голландский аукцион успешно запущен.', type: Auction })
  @ApiResponse({ status: 400, description: 'Ошибка валидации цен (например, пол цены выше старта) или дат.' })
  async createDutch(@Body() dto: CreateDutchAuctionDto) {
    const mockLogtoUserId = 'test-logto-uuid-12345';
    return await this.auctionsService.createDutchAuction(dto, mockLogtoUserId);
  }
}
