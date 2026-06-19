import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Царская Россия', description: 'Название категории предметов старины' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID родительской категории (null если корневая)', required: false })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Монеты Царской России', description: 'Новое название категории', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'b1eedc99-9c0b-4ef8-bb6d-6bb9bd380b22', description: 'ID нового родителя для переноса ветки', required: false })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
