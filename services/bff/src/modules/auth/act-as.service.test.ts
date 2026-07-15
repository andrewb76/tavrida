import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ActAsService } from './act-as.service';

function makeService(opts: {
  adminIds?: string[];
  unlimited?: string[];
}) {
  const adminIds = new Set(opts.adminIds ?? []);
  const keto = {
    isPlatformAdmin: mock.fn(async (id: string) => adminIds.has(id)),
  };
  const config = {
    get: mock.fn((key: string) =>
      key === 'CLUB_INVITES_UNLIMITED_ISSUER_IDS' ? (opts.unlimited ?? []).join(',') : undefined,
    ),
  };
  return new ActAsService(keto as never, config as never);
}

describe('ActAsService', () => {
  it('returns actor unchanged when header missing', async () => {
    const svc = makeService({ adminIds: ['admin-1'] });
    const result = await svc.apply({ sub: 'admin-1' }, undefined);
    assert.deepEqual(result, { sub: 'admin-1' });
  });

  it('swaps sub and sets actorSub for admin', async () => {
    const svc = makeService({ adminIds: ['admin-1'] });
    const result = await svc.apply({ sub: 'admin-1' }, 'user-9');
    assert.deepEqual(result, { sub: 'user-9', actorSub: 'admin-1' });
  });

  it('rejects non-admin actor', async () => {
    const svc = makeService({ adminIds: [] });
    await assert.rejects(
      () => svc.apply({ sub: 'member-1' }, 'user-9'),
      (err: unknown) => err instanceof ForbiddenException,
    );
  });

  it('rejects impersonating another admin', async () => {
    const svc = makeService({ adminIds: ['admin-1', 'admin-2'] });
    await assert.rejects(
      () => svc.apply({ sub: 'admin-1' }, 'admin-2'),
      (err: unknown) => err instanceof ForbiddenException,
    );
  });

  it('allows unlimited issuer env as actor admin', async () => {
    const svc = makeService({ adminIds: [], unlimited: ['boot-admin'] });
    const result = await svc.apply({ sub: 'boot-admin' }, 'user-3');
    assert.deepEqual(result, { sub: 'user-3', actorSub: 'boot-admin' });
  });
});
