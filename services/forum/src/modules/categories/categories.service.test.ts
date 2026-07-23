import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { CategoryAllowedUserEntity } from '../../entities/category-allowed-user.entity';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { CategoriesService } from './categories.service';

function category(
  partial: Partial<CategoryEntity> & Pick<CategoryEntity, 'id' | 'slug' | 'title'>,
): CategoryEntity {
  return {
    parentId: null,
    description: '',
    policy: { allowComments: true },
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    ...partial,
  } as CategoryEntity;
}

function createHarness(
  initialCategories: CategoryEntity[] = [],
  initialTopics: TopicEntity[] = [],
  initialAllow: CategoryAllowedUserEntity[] = [],
) {
  const categories = [...initialCategories];
  const topics = [...initialTopics];
  const allow = [...initialAllow];

  const categoriesRepo = {
    find: async (opts?: { select?: string[]; order?: unknown }) => {
      void opts;
      return [...categories].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      );
    },
    findOne: async ({ where }: { where: { id?: string; slug?: string } }) =>
      categories.find(
        (row) =>
          (where.id == null || row.id === where.id) &&
          (where.slug == null || row.slug === where.slug),
      ) ?? null,
    count: async ({ where }: { where: { parentId?: string; categoryId?: string } }) => {
      if (where.parentId != null) {
        return categories.filter((row) => row.parentId === where.parentId).length;
      }
      if (where.categoryId != null) {
        return topics.filter((row) => row.categoryId === where.categoryId).length;
      }
      return 0;
    },
    create: (data: Partial<CategoryEntity>) => ({ ...data }) as CategoryEntity,
    save: async (row: CategoryEntity) => {
      const index = categories.findIndex((item) => item.id === row.id);
      if (index >= 0) categories[index] = row;
      else categories.push(row);
      return row;
    },
    remove: async (row: CategoryEntity) => {
      const index = categories.findIndex((item) => item.id === row.id);
      if (index >= 0) categories.splice(index, 1);
    },
  } as unknown as Repository<CategoryEntity>;

  const topicsRepo = {
    count: async ({ where }: { where: { categoryId: string } }) =>
      topics.filter((row) => row.categoryId === where.categoryId).length,
  } as unknown as Repository<TopicEntity>;

  const allowRepo = {
    find: async (opts?: {
      where?: { categoryId?: unknown };
      order?: { userId?: 'ASC' };
    }) => {
      let rows = [...allow];
      const cat = opts?.where?.categoryId;
      if (typeof cat === 'string') {
        rows = rows.filter((r) => r.categoryId === cat);
      } else if (cat && typeof cat === 'object') {
        const op = cat as { _value?: string[]; value?: string[] };
        const ids = op._value ?? op.value;
        if (Array.isArray(ids)) {
          rows = rows.filter((r) => ids.includes(r.categoryId));
        }
      }
      return rows.sort((a, b) => a.userId.localeCompare(b.userId));
    },
    create: (data: Partial<CategoryAllowedUserEntity>) =>
      ({ ...data }) as CategoryAllowedUserEntity,
    save: async (rows: CategoryAllowedUserEntity | CategoryAllowedUserEntity[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const idx = allow.findIndex(
          (a) => a.categoryId === row.categoryId && a.userId === row.userId,
        );
        if (idx >= 0) allow[idx] = row;
        else allow.push(row);
      }
      return list;
    },
    delete: async ({ categoryId }: { categoryId: string }) => {
      for (let i = allow.length - 1; i >= 0; i -= 1) {
        if (allow[i]?.categoryId === categoryId) allow.splice(i, 1);
      }
    },
  } as unknown as Repository<CategoryAllowedUserEntity>;

  return {
    service: new CategoriesService(categoriesRepo, topicsRepo, allowRepo),
    categories,
    topics,
    allow,
  };
}

describe('CategoriesService', () => {
  it('listTree returns nested categories', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
      category({ id: 'child', slug: 'finds', title: 'Находки', parentId: 'root' }),
    ]);

    const result = await service.listTree();
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.id, 'root');
    assert.equal(result.data[0]?.children.length, 1);
    assert.equal(result.data[0]?.children[0]?.slug, 'finds');
    assert.equal(result.data[0]?.restricted, false);
  });

  it('listTree hides restricted category from outsiders', async () => {
    const { service } = createHarness(
      [
        category({ id: 'public', slug: 'general', title: 'Общее' }),
        category({ id: 'secret', slug: 'staff', title: 'Staff' }),
      ],
      [],
      [{ categoryId: 'secret', userId: 'user-a' } as CategoryAllowedUserEntity],
    );

    const anon = await service.listTree({ viewerId: null });
    assert.deepEqual(
      anon.data.map((n) => n.id),
      ['public'],
    );

    const member = await service.listTree({ viewerId: 'user-a' });
    assert.equal(member.data.length, 2);

    const other = await service.listTree({ viewerId: 'user-b' });
    assert.deepEqual(
      other.data.map((n) => n.id),
      ['public'],
    );

    const admin = await service.listTree({ viewerId: 'user-b', isAdmin: true, includeMembers: true });
    assert.equal(admin.data.length, 2);
    const secret = admin.data.find((n) => n.id === 'secret');
    assert.equal(secret?.restricted, true);
    assert.deepEqual(secret?.allowedUserIds, ['user-a']);
  });

  it('setMembers empty list makes category public again', async () => {
    const { service, allow } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    await service.setMembers('root', ['u1', 'u2', 'u1']);
    assert.equal(allow.length, 2);

    let members = await service.getMembers('root');
    assert.deepEqual(members.userIds, ['u1', 'u2']);

    await service.setMembers('root', []);
    assert.equal(allow.length, 0);
    members = await service.getMembers('root');
    assert.deepEqual(members.userIds, []);

    await service.assertAccessible('root', { viewerId: 'stranger' });
  });

  it('assertAccessible forbids non-members on restricted category', async () => {
    const { service } = createHarness(
      [category({ id: 'root', slug: 'general', title: 'Общее' })],
      [],
      [{ categoryId: 'root', userId: 'u1' } as CategoryAllowedUserEntity],
    );

    await assert.rejects(
      () => service.assertAccessible('root', { viewerId: 'u2' }),
      (error: unknown) => error instanceof ForbiddenException,
    );

    await service.assertAccessible('root', { viewerId: 'u1' });
    await service.assertAccessible('root', { viewerId: 'u2', isAdmin: true });
  });

  it('create saves a root category', async () => {
    const { service, categories } = createHarness();
    const result = await service.create({
      slug: 'faq',
      title: 'FAQ',
      description: 'Частые вопросы',
    });

    assert.equal(result.slug, 'faq');
    assert.equal(result.title, 'FAQ');
    assert.equal(result.parentId, null);
    assert.equal(result.restricted, false);
    assert.equal(categories.length, 1);
  });

  it('create saves a child category', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    const result = await service.create({
      slug: 'news',
      title: 'Новости',
      parentId: 'root',
    });

    assert.equal(result.parentId, 'root');
  });

  it('create rejects invalid slug', async () => {
    const { service } = createHarness();
    await assert.rejects(
      () => service.create({ slug: 'Bad Slug', title: 'Test' }),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        return true;
      },
    );
  });

  it('create rejects duplicate slug', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    await assert.rejects(
      () => service.create({ slug: 'general', title: 'Дубликат' }),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        return true;
      },
    );
  });

  it('create rejects missing parent', async () => {
    const { service } = createHarness();
    await assert.rejects(
      () => service.create({ slug: 'orphan', title: 'Orphan', parentId: 'missing' }),
      (error: unknown) => {
        assert.ok(error instanceof NotFoundException);
        return true;
      },
    );
  });

  it('update changes fields and keeps same id', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    const result = await service.update('root', {
      title: 'Общий раздел',
      description: 'Описание',
      sortOrder: 5,
    });

    assert.equal(result.id, 'root');
    assert.equal(result.title, 'Общий раздел');
    assert.equal(result.description, 'Описание');
    assert.equal(result.sortOrder, 5);
  });

  it('update rejects self as parent', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    await assert.rejects(
      () => service.update('root', { parentId: 'root' }),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        return true;
      },
    );
  });

  it('update rejects parent cycle', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
      category({ id: 'child', slug: 'finds', title: 'Находки', parentId: 'root' }),
    ]);

    await assert.rejects(
      () => service.update('root', { parentId: 'child' }),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        return true;
      },
    );
  });

  it('remove deletes empty leaf category', async () => {
    const { service, categories } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
    ]);

    const result = await service.remove('root');
    assert.deepEqual(result, { ok: true });
    assert.equal(categories.length, 0);
  });

  it('remove rejects category with children', async () => {
    const { service } = createHarness([
      category({ id: 'root', slug: 'general', title: 'Общее' }),
      category({ id: 'child', slug: 'finds', title: 'Находки', parentId: 'root' }),
    ]);

    await assert.rejects(
      () => service.remove('root'),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        return true;
      },
    );
  });

  it('remove rejects category with topics', async () => {
    const { service } = createHarness(
      [category({ id: 'root', slug: 'general', title: 'Общее' })],
      [{ id: 'topic-1', categoryId: 'root' } as TopicEntity],
    );

    await assert.rejects(
      () => service.remove('root'),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        return true;
      },
    );
  });
});
