import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertInternalAuthConfigured,
  createInternalAuthMiddleware,
  internalServiceHeaders,
  verifyInternalServiceToken,
} from './index';

describe('internal service auth', () => {
  it('requires a configured token in production', () => {
    assert.throws(
      () => assertInternalAuthConfigured({ NODE_ENV: 'production' }),
      /INTERNAL_SERVICE_TOKEN/,
    );
  });

  it('allows tokenless local development', () => {
    assert.deepEqual(
      verifyInternalServiceToken(undefined, { NODE_ENV: 'development' }),
      { ok: true },
    );
  });

  it('rejects missing and invalid production credentials', () => {
    const env = { NODE_ENV: 'production', INTERNAL_SERVICE_TOKEN: 'secret' };
    assert.deepEqual(verifyInternalServiceToken(undefined, env), {
      ok: false,
      detail: 'Missing internal service token',
    });
    assert.deepEqual(verifyInternalServiceToken('Bearer wrong', env), {
      ok: false,
      detail: 'Invalid internal service token',
    });
  });

  it('accepts the configured bearer token', () => {
    assert.deepEqual(
      verifyInternalServiceToken('Bearer secret', {
        NODE_ENV: 'production',
        INTERNAL_SERVICE_TOKEN: 'secret',
      }),
      { ok: true },
    );
  });

  it('adds auth without losing caller headers', () => {
    assert.deepEqual(internalServiceHeaders(' secret ', { 'Content-Type': 'application/json' }), {
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret',
    });
  });

  it('protects internal paths while leaving health public', () => {
    const middleware = createInternalAuthMiddleware({
      NODE_ENV: 'production',
      INTERNAL_SERVICE_TOKEN: 'secret',
    });
    const responses: Array<{ status?: number; body?: unknown }> = [];
    const response = {
      status(code: number) {
        responses.push({ status: code });
        return this;
      },
      json(body: unknown) {
        responses.at(-1)!.body = body;
      },
    };

    let nextCalls = 0;
    middleware(
      { originalUrl: '/internal/v1/auctions', headers: {} },
      response,
      () => {
        nextCalls += 1;
      },
    );
    middleware(
      { originalUrl: '/health/ready', headers: {} },
      response,
      () => {
        nextCalls += 1;
      },
    );
    middleware(
      {
        originalUrl: '/internal/v1/auctions',
        headers: { authorization: 'Bearer secret' },
      },
      response,
      () => {
        nextCalls += 1;
      },
    );

    assert.equal(responses[0]?.status, 401);
    assert.equal(nextCalls, 2);
  });
});
