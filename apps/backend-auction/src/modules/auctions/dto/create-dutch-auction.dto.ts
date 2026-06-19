import { IsString, IsNotEmpty, IsUUID, IsNumber, IsPositive, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDutchAuctionDto {
  @ApiProperty({ example: 'Клад медных монет (100 шт), 18-19 век', description: 'Название лота' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Оптовая партия медных монет. Состояние разное, под реставрацию.', description: 'Описание предметов' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '85f12a3b-4c56-789d-beef-123456789abc', description: 'ID категории' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 5000.00, description: 'Начальная завышенная цена, с которой начнется падение' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  startPrice: number;

  @ApiProperty({ example: 1000.00, description: 'Минимальная цена (пол), ниже которой стоимость не упадет' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  floorPrice: number;

  @ApiProperty({ example: 200.00, description: 'Размер шага, на который будет снижаться цена лота' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  decreaseStep: number;

  @ApiProperty({ example: 10, description: 'Интервал падения цены в минутах (например, каждые 10 минут)' })
  @IsInt()
  @IsPositive()
  decreaseIntervalMinutes: number;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z', description: 'Время старта аукциона' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-02T10:00:00.000Z', description: 'Время гарантированного закрытия, если лот никто не выкупит' })
  @IsDateString()
  endTime: string;
}
