import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isStaleAccessTokenUnauthorized,
  readUnauthorizedPayload,
} from './sessionReauth.logic.js';

describe('sessionReauth token failure detection', () => {
  it('reads nested Nest unauthorized payload', () => {
    const { type, detail } = readUnauthorizedPayload({
      statusCode: 401,
      message: {
        type: 'unauthorized',
        detail:
          'Invalid access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE ' +
          'and the token is an API-resource access token (not an ID token).',
      },
    });
    assert.equal(type, 'unauthorized');
    assert.match(detail ?? '', /Invalid access token/);
  });

  it('triggers on invalid access token detail', () => {
    assert.equal(
      isStaleAccessTokenUnauthorized(401, {
        message: {
          type: 'unauthorized',
          detail:
            'Invalid access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE ' +
            'and the token is an API-resource access token (not an ID token).',
        },
      }),
      true,
    );
  });

  it('triggers on expired token', () => {
    assert.equal(
      isStaleAccessTokenUnauthorized(401, {
        type: 'unauthorized',
        detail: 'Access token expired — sign in again.',
      }),
      true,
    );
  });

  it('triggers on audience mismatch', () => {
    assert.equal(
      isStaleAccessTokenUnauthorized(401, {
        type: 'unauthorized',
        detail:
          'Access token audience mismatch. VITE_LOGTO_API_RESOURCE must equal LOGTO_AUDIENCE, ' +
          'and the SPA must request that API resource (re-login after changing Logto config).',
      }),
      true,
    );
  });

  it('ignores missing bearer', () => {
    assert.equal(
      isStaleAccessTokenUnauthorized(401, {
        type: 'unauthorized',
        detail: 'Missing Bearer token',
      }),
      false,
    );
  });

  it('ignores non-401', () => {
    assert.equal(
      isStaleAccessTokenUnauthorized(403, {
        type: 'unauthorized',
        detail: 'Invalid access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE',
      }),
      false,
    );
  });
});
