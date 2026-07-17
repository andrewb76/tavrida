import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { MeController } from './me.controller';

describe('MeController identity sync', () => {
  it('writes Logto claims to the JWT actor during impersonation', async () => {
    const syncIdentity = mock.fn(async (userId: string) => ({ userId, synced: true }));
    const controller = new MeController({ syncIdentity } as never);

    const result = await controller.syncIdentity(
      { sub: 'john-doe', actorSub: 'andrew-admin' },
      { name: 'Andrew Butov' },
    );

    assert.equal(syncIdentity.mock.calls[0]?.arguments[0], 'andrew-admin');
    assert.deepEqual(result, { userId: 'andrew-admin', synced: true });
  });

  it('writes Logto claims to the current user outside impersonation', async () => {
    const syncIdentity = mock.fn(async (userId: string) => ({ userId, synced: true }));
    const controller = new MeController({ syncIdentity } as never);

    await controller.syncIdentity({ sub: 'andrew-admin' }, { name: 'Andrew Butov' });

    assert.equal(syncIdentity.mock.calls[0]?.arguments[0], 'andrew-admin');
  });
});
