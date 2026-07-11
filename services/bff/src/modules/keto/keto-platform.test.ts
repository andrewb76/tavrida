import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertCanRevokeAdmin,
  buildPlatformTuple,
  diffPlatformRoles,
} from './keto-platform';

describe('keto-platform', () => {
  it('buildPlatformTuple formats subject_id', () => {
    const tuple = buildPlatformTuple(
      { namespace: 'TavridaLot', object: 'platform:tavrida-lot' },
      'abc123',
      'admin',
    );
    assert.deepEqual(tuple, {
      namespace: 'TavridaLot',
      object: 'platform:tavrida-lot',
      relation: 'admin',
      subject_id: 'user:abc123',
    });
  });

  it('diffPlatformRoles computes grants and revokes', () => {
    const result = diffPlatformRoles(['member', 'moderator'], {
      admin: true,
      moderator: false,
      expert: true,
    });
    assert.deepEqual(result.grants, ['admin', 'expert']);
    assert.deepEqual(result.revokes, ['moderator']);
  });

  it('assertCanRevokeAdmin blocks self-demote', () => {
    assert.throws(
      () => assertCanRevokeAdmin('self', 'self', ['admin']),
      /Cannot revoke your own admin role/,
    );
  });
});
