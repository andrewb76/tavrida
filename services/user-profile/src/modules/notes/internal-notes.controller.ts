import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
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
  getForPair(@Query('ownerId') ownerId: string, @Query('authorId') authorId: string) {
    return this.notes.getForPair(ownerId, authorId);
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
