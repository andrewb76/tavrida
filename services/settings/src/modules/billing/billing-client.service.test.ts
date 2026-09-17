import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach, afterEach } from 'node:test';

import { BillingClient } from './billing-client.service';

function createHarness() {
  const config = {
    get: (key: string) => {
      if (key === 'BILLING_URL') return 'http://billing:3001';
      if (key === 'INTERNAL_SERVICE_TOKEN') return 'test-token';
      return undefined;
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const client = new BillingClient(config);

  return { client, config };
}

describe('BillingClient', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    fetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({ transactionId: 'tx-1', status: 'COMPLETED', balanceAfter: 0 }),
    }) as Response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchMock as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls charge endpoint with correct params', async () => {
    const { client } = createHarness();
    const result = await client.charge({
      userId: 'u1',
      amount: 500,
      target: 'settings.activate:basic',
      description: 'Basic (мес.)',
    });

    assert.equal(result.transactionId, 'tx-1');
    assert.equal(result.status, 'COMPLETED');

    assert.equal(fetchMock.mock.calls.length, 1);
    const call = fetchMock.mock.calls[0];
    const url = call.arguments[0] as string;
    const opts = call.arguments[1] as RequestInit;
    assert.equal(url, 'http://billing:3001/internal/v1/wallets/charge');
    assert.equal(opts.method, 'POST');
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    assert.equal(body.userId, 'u1');
    assert.equal(body.amount, 500);
    assert.equal(body.target, 'settings.activate:basic');
    assert.equal(body.description, 'Basic (мес.)');
  });

  it('generates idempotency key when not provided', async () => {
    const { client } = createHarness();
    await client.charge({
      userId: 'u1',
      amount: 100,
      target: 'test',
      description: 'test',
    });

    const call = fetchMock.mock.calls[0];
    const opts = call.arguments[1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    assert.ok(typeof headers['Idempotency-Key'] === 'string');
    assert.ok(headers['Idempotency-Key'].length > 0);
  });

  it('uses provided idempotency key', async () => {
    const { client } = createHarness();
    await client.charge({
      userId: 'u1',
      amount: 100,
      target: 'test',
      description: 'test',
      idempotencyKey: 'my-key',
    });

    const call = fetchMock.mock.calls[0];
    const opts = call.arguments[1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    assert.equal(headers['Idempotency-Key'], 'my-key');
  });

  it('throws on billing error response', async () => {
    fetchMock = mock.fn(async () => ({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      json: async () => ({ type: 'insufficient_balance', balance: 0, required: 500 }),
    }) as Response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchMock as any;

    const { client } = createHarness();
    await assert.rejects(
      () => client.charge({ userId: 'u1', amount: 500, target: 'test', description: 'test' }),
      (err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        assert.equal(err.status, 402);
        return true;
      },
    );
  });

  it('throws ServiceUnavailableException on 5xx', async () => {
    fetchMock = mock.fn(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ detail: 'down' }),
    }) as Response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchMock as any;

    const { client } = createHarness();
    await assert.rejects(
      () => client.charge({ userId: 'u1', amount: 500, target: 'test', description: 'test' }),
      (err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        assert.equal(err.status, 503);
        return true;
      },
    );
  });
});
