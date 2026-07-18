import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { NotesService } from './notes.service';

class UpsertNoteBody {
  @IsString()
  @MinLength(1)
  ownerId!: string;

  @IsString()
  @MinLength(1)
  authorId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

@Controller('internal/v1/profile-notes')
export class InternalNotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  async getForPair(
    @Query('ownerId') ownerId: string,
    @Query('authorId') authorId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!ownerId?.trim() || !authorId?.trim()) {
      throw new BadRequestException({
        type: 'validation',
        detail: 'ownerId and authorId are required',
      });
    }
    const note = await this.notes.getForPair(ownerId, authorId);
    // Explicit JSON null — Nest otherwise may emit an empty 200 body.
    if (!note) {
      res.status(200).json(null);
      return;
    }
    return note;
  }

  @Post()
  upsert(@Body() body: UpsertNoteBody) {
    return this.notes.upsert(body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('authorId') authorId: string) {
    return this.notes.delete(id, authorId);
  }
}
