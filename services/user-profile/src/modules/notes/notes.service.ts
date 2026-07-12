import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ProfileNoteEntity } from '../../entities/profile-note.entity';

const MAX_NOTE_LENGTH = 2000;

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(ProfileNoteEntity)
    private readonly notes: Repository<ProfileNoteEntity>,
  ) {}

  async getForPair(ownerId: string, authorId: string) {
    const row = await this.notes.findOne({ where: { ownerId, authorId } });
    if (!row) return null;
    return this.toDto(row);
  }

  async upsert(input: { ownerId: string; authorId: string; text: string }) {
    const text = input.text.trim();
    if (!text) {
      throw new ForbiddenException({ type: 'validation', detail: 'Note text is required' });
    }
    if (text.length > MAX_NOTE_LENGTH) {
      throw new ForbiddenException({
        type: 'validation',
        detail: `Note exceeds ${MAX_NOTE_LENGTH} characters`,
      });
    }

    const existing = await this.notes.findOne({
      where: { ownerId: input.ownerId, authorId: input.authorId },
    });

    if (existing) {
      existing.text = text;
      const saved = await this.notes.save(existing);
      return this.toDto(saved);
    }

    const created = await this.notes.save(
      this.notes.create({
        id: randomUUID(),
        ownerId: input.ownerId,
        authorId: input.authorId,
        text,
      }),
    );
    return this.toDto(created);
  }

  async delete(noteId: string, authorId: string) {
    const row = await this.notes.findOne({ where: { id: noteId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Note ${noteId} not found` });
    }
    if (row.authorId !== authorId) {
      throw new ForbiddenException({ type: 'forbidden', detail: 'Only note author can delete' });
    }
    await this.notes.delete({ id: noteId });
    return { id: noteId, deleted: true };
  }

  private toDto(row: ProfileNoteEntity) {
    return {
      id: row.id,
      ownerId: row.ownerId,
      authorId: row.authorId,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
