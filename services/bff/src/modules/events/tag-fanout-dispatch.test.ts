import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDomainEvent } from './domain-events';
import { chooseTagFanoutDispatch } from './tag-fanout-dispatch';

describe('tag-fanout-dispatch', () => {
  it('noops when no tags added', () => {
    assert.deepEqual(chooseTagFanoutDispatch({ addedTagIds: [], rmqPublished: false }), {
      mode: 'noop',
    });
  });

  it('prefers RMQ when publish succeeded', () => {
    assert.deepEqual(
      chooseTagFanoutDispatch({ addedTagIds: ['t1'], rmqPublished: true }),
      { mode: 'rmq' },
    );
  });

  it('falls back to HTTP when RMQ unavailable', () => {
    assert.deepEqual(
      chooseTagFanoutDispatch({ addedTagIds: ['t1'], rmqPublished: false }),
      { mode: 'http-fallback' },
    );
  });
});

describe('createDomainEvent', () => {
  it('builds envelope for tag.content_tagged', () => {
    const env = createDomainEvent({
      eventType: 'tag.content_tagged',
      producer: 'bff',
      payload: { tagId: 't1', topicId: 'topic-1', contentType: 'topic', contentId: 'topic-1' },
      eventId: 'evt-1',
      correlationId: 'topic-1',
    });
    assert.equal(env.eventId, 'evt-1');
    assert.equal(env.eventType, 'tag.content_tagged');
    assert.equal(env.eventVersion, '1');
    assert.equal(env.producer, 'bff');
    assert.equal(env.correlationId, 'topic-1');
    assert.equal(env.payload.tagId, 't1');
  });
});
