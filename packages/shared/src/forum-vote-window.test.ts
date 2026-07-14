import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canChangeForumVote } from './forum-vote-window.js';

describe('canChangeForumVote', () => {
  const firstVotedAt = '2026-01-01T12:00:00.000Z';

  it('never allows change when window is 0', () => {
    assert.equal(canChangeForumVote(firstVotedAt, 0, new Date('2026-01-01T12:00:30.000Z')), false);
  });

  it('always allows when window is -1', () => {
    assert.equal(canChangeForumVote(firstVotedAt, -1, new Date('2030-01-01T00:00:00.000Z')), true);
  });

  it('allows within minutes and blocks after', () => {
    assert.equal(canChangeForumVote(firstVotedAt, 3, new Date('2026-01-01T12:02:59.000Z')), true);
    assert.equal(canChangeForumVote(firstVotedAt, 3, new Date('2026-01-01T12:03:01.000Z')), false);
  });
});
