import { IsUUID, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAutoBidDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  auctionId: string;

  @ApiProperty({ example: 10000.00, description: 'Максимальная сумма, выше которой робот не пойдет' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maxAmount: number;
}
