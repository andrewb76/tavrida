import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canEditForumContent, parseEditWindowMinutes } from './forum-edit-window.js';

describe('parseEditWindowMinutes', () => {
  it('accepts 0, positive minutes, and -1', () => {
    assert.equal(parseEditWindowMinutes(0), 0);
    assert.equal(parseEditWindowMinutes(15), 15);
    assert.equal(parseEditWindowMinutes(-1), -1);
    assert.equal(parseEditWindowMinutes(-5), -5);
  });

  it('falls back for invalid values', () => {
    assert.equal(parseEditWindowMinutes('10'), 10);
    assert.equal(parseEditWindowMinutes(null), 10);
  });
});

describe('canEditForumContent', () => {
  const createdAt = '2026-01-01T12:00:00.000Z';

  it('blocks when window is 0', () => {
    assert.equal(canEditForumContent(createdAt, 0, new Date('2026-01-01T12:01:00.000Z')), false);
  });

  it('allows always when window is -1', () => {
    assert.equal(canEditForumContent(createdAt, -1, new Date('2030-01-01T12:00:00.000Z')), true);
  });

  it('allows inside window and blocks after expiry', () => {
    assert.equal(canEditForumContent(createdAt, 10, new Date('2026-01-01T12:09:59.000Z')), true);
    assert.equal(canEditForumContent(createdAt, 10, new Date('2026-01-01T12:10:01.000Z')), false);
  });
});
