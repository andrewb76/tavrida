import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { directPairKey, directSelfKey } from './chat.types';

describe('chat.types', () => {
  it('directPairKey is order-independent', () => {
    assert.equal(directPairKey('b', 'a'), directPairKey('a', 'b'));
  });

  it('directSelfKey is namespaced', () => {
    assert.equal(directSelfKey('u1'), 'self:u1');
  });
});
