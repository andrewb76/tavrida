import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { forumVoteKarmaDelta } from './forum-vote-karma.js';

describe('forumVoteKarmaDelta', () => {
  const plus = 0.2;
  const minus = 0.2;

  it('applies plus and minus on first cast', () => {
    assert.equal(forumVoteKarmaDelta(null, 1, plus, minus), 0.2);
    assert.equal(forumVoteKarmaDelta(null, -1, plus, minus), -0.2);
  });

  it('reverses on switch', () => {
    assert.equal(forumVoteKarmaDelta(1, -1, plus, minus), -0.4);
    assert.equal(forumVoteKarmaDelta(-1, 1, plus, minus), 0.4);
  });

  it('clears contribution when removed', () => {
    assert.equal(forumVoteKarmaDelta(1, null, plus, minus), -0.2);
    assert.equal(forumVoteKarmaDelta(-1, null, plus, minus), 0.2);
  });

  it('is zero when unchanged', () => {
    assert.equal(forumVoteKarmaDelta(1, 1, plus, minus), 0);
    assert.equal(forumVoteKarmaDelta(null, null, plus, minus), 0);
  });
});
