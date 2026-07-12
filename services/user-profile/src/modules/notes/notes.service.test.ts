import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { ProfileNoteEntity } from '../../entities/profile-note.entity';
import { NotesService } from './notes.service';

function createHarness(rows: ProfileNoteEntity[]) {
  const store = [...rows];
  const notes = {
    findOne: async ({ where }: { where: Partial<ProfileNoteEntity> }) =>
      store.find(
        (row) =>
          (where.ownerId == null || row.ownerId === where.ownerId) &&
          (where.authorId == null || row.authorId === where.authorId) &&
          (where.id == null || row.id === where.id),
      ) ?? null,
    create: (data: Partial<ProfileNoteEntity>) => ({ ...data }) as ProfileNoteEntity,
    save: async (row: ProfileNoteEntity) => {
      const now = new Date('2026-01-02');
      if (!row.createdAt) row.createdAt = now;
      if (!row.updatedAt) row.updatedAt = now;
      const index = store.findIndex((item) => item.id === row.id);
      if (index >= 0) store[index] = row;
      else store.push(row);
      return row;
    },
    delete: async ({ id }: { id: string }) => {
      const index = store.findIndex((row) => row.id === id);
      if (index >= 0) store.splice(index, 1);
    },
  } as unknown as Repository<ProfileNoteEntity>;

  return { service: new NotesService(notes), store };
}

describe('NotesService', () => {
  it('upserts one note per owner/author pair', async () => {
    const { service, store } = createHarness([]);
    const first = await service.upsert({
      ownerId: 'owner-1',
      authorId: 'author-1',
      text: 'Внимательный продавец',
    });
    const second = await service.upsert({
      ownerId: 'owner-1',
      authorId: 'author-1',
      text: 'Обновлённая заметка',
    });

    assert.equal(store.length, 1);
    assert.equal(first.id, second.id);
    assert.equal(second.text, 'Обновлённая заметка');
  });
});
