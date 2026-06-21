import { IsString, IsNotEmpty, IsUUID, IsEnum, IsNumber, IsPositive, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuctionType } from '../entities/auction.entity';

export class CreateEnglishAuctionDto {
  @ApiProperty({ example: 'Коллекционный Рубль 1896 года', description: 'Название лота' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Серебро, состояние VF, отличный блеск.', description: 'Описание предмета старины' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '85f12a3b-4c56-789d-beef-123456789abc', description: 'ID финальной ветки категории' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 1000.00, description: 'Стартовая цена' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  startPrice: number;

  @ApiProperty({ example: 50.00, description: 'Минимальный шаг ставки' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  minStep: number;

  @ApiProperty({ example: 5000.00, description: 'Цена Блиц (моментальный выкуп)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  buyNowPrice?: number;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z', description: 'Время старта торгов (для статуса PENDING)' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-08T10:00:00.000Z', description: 'Запланированное время окончания' })
  @IsDateString()
  plannedEndTime: string;
}
