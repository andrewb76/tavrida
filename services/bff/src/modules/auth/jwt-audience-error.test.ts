import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function joseFailureReason(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : '';

  if (code === 'ERR_JWT_EXPIRED' || /"exp"|"exp" claim timestamp check failed|jwt expired/i.test(message)) {
    return 'Access token expired — sign in again.';
  }
  if (
    code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ||
    /unexpected "aud"|audience|"aud"/i.test(message)
  ) {
    return (
      'Access token audience mismatch. VITE_LOGTO_API_RESOURCE must equal LOGTO_AUDIENCE, ' +
      'and the SPA must request that API resource (re-login after changing Logto config).'
    );
  }
  return (
    'Invalid access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE ' +
    'and the token is an API-resource access token (not an ID token).'
  );
}

describe('jwt audience error mapping', () => {
  it('maps expired tokens', () => {
    assert.match(
      joseFailureReason(Object.assign(new Error('jwt expired'), { code: 'ERR_JWT_EXPIRED' })),
      /expired/i,
    );
  });

  it('maps audience failures', () => {
    assert.match(
      joseFailureReason(
        Object.assign(new Error('unexpected "aud" claim value'), {
          code: 'ERR_JWT_CLAIM_VALIDATION_FAILED',
        }),
      ),
      /audience mismatch/i,
    );
  });
});
