import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileNoteEntity } from '../../entities/profile-note.entity';
import { InternalNotesController } from './internal-notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileNoteEntity])],
  controllers: [InternalNotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
