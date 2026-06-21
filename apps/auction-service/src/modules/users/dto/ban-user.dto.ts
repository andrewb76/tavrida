import { IsString, IsNotEmpty, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BanUserDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID локального пользователя (не Logto ID)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Систематический невыкуп выигранных на английском аукционе лотов.', description: 'Причина блокировки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({ example: '2026-07-19T12:00:00.000Z', description: 'Дата и время, до которых пользователь будет заблокирован' })
  @IsDateString()
  bannedUntil: string;
}
