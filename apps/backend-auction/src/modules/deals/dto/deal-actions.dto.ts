import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShipDealDto {
  @ApiProperty({ example: 'RU123456789HK', description: 'Почтовый трек-номер посылки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  trackingNumber: string;
}

export class LeaveReviewDto {
  @ApiProperty({ example: true, description: 'true = палец вверх (+1 к рейтингу), false = палец вниз (-1)' })
  @IsBoolean()
  isPositive: boolean;

  @ApiProperty({ example: 'Отличный нумизмат, монета приехала в идеальном состоянии.', description: 'Текст отзыва' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
