import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  extractLogtoUserId,
  verifyLogtoWebhookSignature,
} from './logto-webhook.util';

describe('logto-webhook.util', () => {
  it('verifyLogtoWebhookSignature accepts valid HMAC', () => {
    const signingKey = 'test-signing-key';
    const rawBody = Buffer.from('{"event":"User.Created"}');
    const expected = createHmac('sha256', signingKey).update(rawBody).digest('hex');

    assert.equal(verifyLogtoWebhookSignature(signingKey, rawBody, expected), true);
    assert.equal(verifyLogtoWebhookSignature(signingKey, rawBody, 'deadbeef'), false);
  });

  it('extractLogtoUserId prefers entity id', () => {
    assert.equal(
      extractLogtoUserId({
        event: 'User.Created',
        data: { id: 'user-1', name: 'Alice' },
      }),
      'user-1',
    );
    assert.equal(
      extractLogtoUserId({
        event: 'PostRegister',
        user: { id: 'user-2' },
      }),
      'user-2',
    );
    assert.equal(
      extractLogtoUserId({
        event: 'User.Deleted',
        params: { userId: 'user-3' },
      }),
      'user-3',
    );
  });
});
