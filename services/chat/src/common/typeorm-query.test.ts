import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePgTimestamp, unwrapTypeOrmRows } from './typeorm-query';

describe('unwrapTypeOrmRows', () => {
  it('unwraps UPDATE [rows, rowCount] shape', () => {
    const at = new Date('2026-07-28T12:00:00.000Z');
    const rows = unwrapTypeOrmRows<{ lastReadAt: Date; lastReadMessageId: string }>([
      [{ lastReadAt: at, lastReadMessageId: 'm1' }],
      1,
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.lastReadMessageId, 'm1');
    assert.equal(rows[0]?.lastReadAt.toISOString(), at.toISOString());
  });

  it('passes through bare SELECT rows', () => {
    const rows = unwrapTypeOrmRows([{ id: 'a' }, { id: 'b' }]);
    assert.deepEqual(
      rows.map((r) => r.id),
      ['a', 'b'],
    );
  });

  it('returns empty for unexpected shapes', () => {
    assert.deepEqual(unwrapTypeOrmRows(null), []);
    assert.deepEqual(unwrapTypeOrmRows(undefined), []);
    assert.deepEqual(unwrapTypeOrmRows('x'), []);
  });
});

describe('parsePgTimestamp', () => {
  it('parses Date and ISO strings', () => {
    const at = new Date('2026-07-28T12:00:00.000Z');
    assert.equal(parsePgTimestamp(at)?.toISOString(), at.toISOString());
    assert.equal(
      parsePgTimestamp('2026-07-28T12:00:00.000Z')?.toISOString(),
      at.toISOString(),
    );
  });

  it('rejects invalid values', () => {
    assert.equal(parsePgTimestamp(undefined), null);
    assert.equal(parsePgTimestamp('nope'), null);
    assert.equal(parsePgTimestamp(new Date('invalid')), null);
  });
});
