import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { Bid } from './entities/bid.entity';

@ApiTags('Ставки (Bids)') // Группировка в UI Swagger
@ApiBearerAuth() // Пометка, что эндпоинт требует JWT токен от Logto
@Controller('api/bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Сделать ставку на лот', description: 'Обрабатывает ставку с учетом правил выбранного аукциона и защитой от Race Condition.' })
  @ApiResponse({ status: 201, description: 'Ставка успешно принята.', type: Bid })
  @ApiResponse({ status: 400, description: 'Ошибка валидации или нарушение правил аукциона (маленький шаг, бан пользователя и т.д.).' })
  @ApiResponse({ status: 404, description: 'Аукцион или пользователь не найден.' })
  async placeBid(@Body() placeBidDto: PlaceBidDto) {
    // Временный ID тестового пользователя. Когда подключим Logto, будем брать из req.user.sub
    const mockLogtoUserId = 'test-logto-uuid-12345'; 
    
    return await this.bidsService.placeBid(placeBidDto, mockLogtoUserId);
  }
}
