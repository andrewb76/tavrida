import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { AccessGroupMemberEntity } from '../../entities/access-group-member.entity';
import { AccessGroupEntity } from '../../entities/access-group.entity';
import { CategoryAccessGroupEntity } from '../../entities/category-access-group.entity';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { AccessGroupsService } from '../access-groups/access-groups.service';
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
  initialGroups: AccessGroupEntity[] = [],
  initialMembers: AccessGroupMemberEntity[] = [],
  initialLinks: CategoryAccessGroupEntity[] = [],
) {
  const categories = [...initialCategories];
  const topics = [...initialTopics];
  const groups = [...initialGroups];
  const members = [...initialMembers];
  const links = [...initialLinks];

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

  const groupsRepo = {
    find: async (opts?: { where?: { id?: unknown }; order?: { name?: 'ASC' } }) => {
      let rows = [...groups];
      const idFilter = opts?.where?.id;
      if (idFilter && typeof idFilter === 'object') {
        const op = idFilter as { _value?: string[]; value?: string[] };
        const ids = op._value ?? op.value;
        if (Array.isArray(ids)) rows = rows.filter((r) => ids.includes(r.id));
      }
      if (opts?.order?.name === 'ASC') {
        rows.sort((a, b) => a.name.localeCompare(b.name));
      }
      return rows;
    },
    findOne: async ({ where }: { where: { id?: string; name?: string } }) =>
      groups.find(
        (row) =>
          (where.id == null || row.id === where.id) &&
          (where.name == null || row.name === where.name),
      ) ?? null,
    create: (data: Partial<AccessGroupEntity>) => ({ ...data }) as AccessGroupEntity,
    save: async (row: AccessGroupEntity) => {
      const index = groups.findIndex((item) => item.id === row.id);
      if (index >= 0) groups[index] = row;
      else groups.push(row);
      return row;
    },
    remove: async (row: AccessGroupEntity) => {
      const index = groups.findIndex((item) => item.id === row.id);
      if (index >= 0) groups.splice(index, 1);
      for (let i = members.length - 1; i >= 0; i -= 1) {
        if (members[i]?.groupId === row.id) members.splice(i, 1);
      }
      for (let i = links.length - 1; i >= 0; i -= 1) {
        if (links[i]?.groupId === row.id) links.splice(i, 1);
      }
    },
  } as unknown as Repository<AccessGroupEntity>;

  const membersRepo = {
    find: async (opts?: {
      where?: { groupId?: unknown; userId?: string };
      order?: { userId?: 'ASC' };
    }) => {
      let rows = [...members];
      const gid = opts?.where?.groupId;
      if (typeof gid === 'string') {
        rows = rows.filter((r) => r.groupId === gid);
      } else if (gid && typeof gid === 'object') {
        const op = gid as { _value?: string[]; value?: string[] };
        const ids = op._value ?? op.value;
        if (Array.isArray(ids)) rows = rows.filter((r) => ids.includes(r.groupId));
      }
      if (opts?.where?.userId) {
        rows = rows.filter((r) => r.userId === opts.where?.userId);
      }
      if (opts?.order?.userId === 'ASC') {
        rows.sort((a, b) => a.userId.localeCompare(b.userId));
      }
      return rows;
    },
    count: async ({ where }: { where: { groupId: string } }) =>
      members.filter((r) => r.groupId === where.groupId).length,
    create: (data: Partial<AccessGroupMemberEntity>) =>
      ({ ...data }) as AccessGroupMemberEntity,
    save: async (rows: AccessGroupMemberEntity | AccessGroupMemberEntity[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const idx = members.findIndex(
          (a) => a.groupId === row.groupId && a.userId === row.userId,
        );
        if (idx >= 0) members[idx] = row;
        else members.push(row);
      }
      return list;
    },
    delete: async ({ groupId }: { groupId: string }) => {
      for (let i = members.length - 1; i >= 0; i -= 1) {
        if (members[i]?.groupId === groupId) members.splice(i, 1);
      }
    },
  } as unknown as Repository<AccessGroupMemberEntity>;

  const linksRepo = {
    find: async (opts?: {
      where?: { categoryId?: unknown };
      order?: { groupId?: 'ASC' };
    }) => {
      let rows = [...links];
      const cat = opts?.where?.categoryId;
      if (typeof cat === 'string') {
        rows = rows.filter((r) => r.categoryId === cat);
      } else if (cat && typeof cat === 'object') {
        const op = cat as { _value?: string[]; value?: string[] };
        const ids = op._value ?? op.value;
        if (Array.isArray(ids)) rows = rows.filter((r) => ids.includes(r.categoryId));
      }
      if (opts?.order?.groupId === 'ASC') {
        rows.sort((a, b) => a.groupId.localeCompare(b.groupId));
      }
      return rows;
    },
    create: (data: Partial<CategoryAccessGroupEntity>) =>
      ({ ...data }) as CategoryAccessGroupEntity,
    save: async (rows: CategoryAccessGroupEntity | CategoryAccessGroupEntity[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const idx = links.findIndex(
          (a) => a.categoryId === row.categoryId && a.groupId === row.groupId,
        );
        if (idx >= 0) links[idx] = row;
        else links.push(row);
      }
      return list;
    },
    delete: async ({ categoryId }: { categoryId: string }) => {
      for (let i = links.length - 1; i >= 0; i -= 1) {
        if (links[i]?.categoryId === categoryId) links.splice(i, 1);
      }
    },
  } as unknown as Repository<CategoryAccessGroupEntity>;

  const accessGroups = new AccessGroupsService(
    groupsRepo,
    membersRepo,
    linksRepo,
    categoriesRepo,
  );
  const service = new CategoriesService(categoriesRepo, topicsRepo, accessGroups);

  return { service, accessGroups, categories, groups, members, links };
}

describe('CategoriesService (access groups)', () => {
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

  it('listTree hides restricted category; OR across groups', async () => {
    const { service } = createHarness(
      [
        category({ id: 'public', slug: 'general', title: 'Общее' }),
        category({ id: 'secret', slug: 'staff', title: 'Staff' }),
      ],
      [],
      [
        { id: 'g1', name: 'Alpha', description: '', createdAt: new Date(), updatedAt: new Date() },
        { id: 'g2', name: 'Beta', description: '', createdAt: new Date(), updatedAt: new Date() },
      ] as AccessGroupEntity[],
      [
        { groupId: 'g1', userId: 'user-a' },
        { groupId: 'g2', userId: 'user-b' },
      ] as AccessGroupMemberEntity[],
      [
        { categoryId: 'secret', groupId: 'g1' },
        { categoryId: 'secret', groupId: 'g2' },
      ] as CategoryAccessGroupEntity[],
    );

    const anon = await service.listTree({ viewerId: null });
    assert.deepEqual(
      anon.data.map((n) => n.id),
      ['public'],
    );

    const memberA = await service.listTree({ viewerId: 'user-a' });
    assert.equal(memberA.data.length, 2);

    const memberB = await service.listTree({ viewerId: 'user-b' });
    assert.equal(memberB.data.length, 2);

    const other = await service.listTree({ viewerId: 'user-c' });
    assert.deepEqual(
      other.data.map((n) => n.id),
      ['public'],
    );

    const admin = await service.listTree({
      viewerId: 'user-c',
      isAdmin: true,
      includeAccessGroups: true,
    });
    assert.equal(admin.data.length, 2);
    const secret = admin.data.find((n) => n.id === 'secret');
    assert.equal(secret?.restricted, true);
    assert.deepEqual(secret?.accessGroupIds?.sort(), ['g1', 'g2']);
  });

  it('setAccessGroups empty list makes category public again', async () => {
    const { service, accessGroups, links } = createHarness(
      [category({ id: 'root', slug: 'general', title: 'Общее' })],
      [],
      [
        { id: 'g1', name: 'Alpha', description: '', createdAt: new Date(), updatedAt: new Date() },
      ] as AccessGroupEntity[],
    );

    await accessGroups.setCategoryGroups('root', ['g1']);
    assert.equal(links.length, 1);

    let linked = await service.getAccessGroups('root');
    assert.deepEqual(linked.groupIds, ['g1']);

    await service.setAccessGroups('root', []);
    assert.equal(links.length, 0);
    linked = await service.getAccessGroups('root');
    assert.deepEqual(linked.groupIds, []);

    await service.assertAccessible('root', { viewerId: 'stranger' });
  });

  it('assertAccessible forbids non-members on restricted category', async () => {
    const { service } = createHarness(
      [category({ id: 'root', slug: 'general', title: 'Общее' })],
      [],
      [
        { id: 'g1', name: 'Alpha', description: '', createdAt: new Date(), updatedAt: new Date() },
      ] as AccessGroupEntity[],
      [{ groupId: 'g1', userId: 'u1' }] as AccessGroupMemberEntity[],
      [{ categoryId: 'root', groupId: 'g1' }] as CategoryAccessGroupEntity[],
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
