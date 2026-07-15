import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KNOWN_WORKFLOWS } from './notifications.service';

describe('KNOWN_WORKFLOWS', () => {
  it('includes tag-content for TAG subscriptions', () => {
    assert.equal(KNOWN_WORKFLOWS.has('tag-content'), true);
  });

  it('includes core transactional workflows', () => {
    assert.equal(KNOWN_WORKFLOWS.has('forum-reply'), true);
    assert.equal(KNOWN_WORKFLOWS.has('feedback-request'), true);
  });
});
