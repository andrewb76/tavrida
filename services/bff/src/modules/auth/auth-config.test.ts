import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAuthMode } from './auth-config';

const validLogto = {
  LOGTO_ENDPOINT: 'https://tenant.logto.app',
  LOGTO_JWKS_URL: 'https://tenant.logto.app/oidc/jwks',
  LOGTO_AUDIENCE: 'https://api.tavrida-lot.localhost',
};

describe('resolveAuthMode', () => {
  it('uses JWKS only when issuer, key set, and audience are configured', () => {
    assert.equal(resolveAuthMode({ NODE_ENV: 'production', ...validLogto }), 'jwks');
  });

  it('permits explicit dev tokens only outside production', () => {
    assert.equal(
      resolveAuthMode({
        NODE_ENV: 'development',
        BFF_ALLOW_DEV_TOKENS: 'true',
      }),
      'dev-token',
    );
  });

  it('fails closed when Logto is missing and dev tokens are not explicitly enabled', () => {
    assert.throws(() => resolveAuthMode({ NODE_ENV: 'development' }), /not configured/);
  });

  it('fails closed in production even when dev tokens are requested', () => {
    assert.throws(
      () =>
        resolveAuthMode({
          NODE_ENV: 'production',
          BFF_ALLOW_DEV_TOKENS: 'true',
        }),
      /not configured/,
    );
  });

  it('rejects placeholder Logto configuration', () => {
    assert.throws(
      () =>
        resolveAuthMode({
          NODE_ENV: 'production',
          LOGTO_ENDPOINT: 'https://logto.example.com',
          LOGTO_JWKS_URL: 'https://logto.example.com/oidc/jwks',
          LOGTO_AUDIENCE: 'api',
        }),
      /not configured/,
    );
  });
});

