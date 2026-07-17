import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenException } from '@nestjs/common';

import type { AuthUser } from '../auth/current-user.decorator';
import type { BillingClient } from '../billing/billing.client';
import type { MediaLimitsService } from '../media/media-limits.service';
import type { MediaStorageService } from '../media/media-storage.service';
import { AuctionController } from './auction.controller';
import type { AuctionClient } from './auction.client';
import type { AuctionPlanPolicyService } from './auction-plan-policy.service';
import { buildSellerPlanOptions } from './auction-plan-policy.logic';

const USER: AuthUser = { sub: 'seller-1' };

const validCreateBody = {
  title: 'Test lot',
  description: '1234567890',
  type: 'ENGLISH' as const,
  startingPrice: 100,
  bidIncrement: 10,
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 3600_000).toISOString(),
};

function freeSellerOptions(lotsCreatedToday: number) {
  const options = buildSellerPlanOptions({
    planId: 'free',
    allowedTypes: ['ENGLISH'],
    maxDurationHours: 72,
    promotionEnabled: false,
    reserveEnabled: false,
    dailyLimit: 3,
    promotionUnitPrice: 200,
    reserveUnitPrice: 100,
  });
  return {
    ...options,
    dailyLimitSummary: {
      limit: 3,
      used: lotsCreatedToday,
      remaining: Math.max(0, 3 - lotsCreatedToday),
    },
  };
}

function createHarness(planId: string, lotsCreatedToday = 0) {
  const calls = {
    listAuctions: [] as Record<string, unknown>[],
    createAuction: [] as Record<string, unknown>[],
    getAuction: [] as string[],
    listBids: [] as string[],
    listExpertAppraisals: [] as string[],
    getSellerMeta: [] as string[],
    charges: [] as Record<string, unknown>[],
  };

  const auction = {
    listAuctions: async (query: Record<string, unknown>) => {
      calls.listAuctions.push(query);
      return {
        items: [{ id: 'lot-1' }],
        nextCursor: null,
        meta: { limit: 20, searchScope: 'TITLE', appliedFilters: {} },
      };
    },
    getAuction: async (id: string) => {
      calls.getAuction.push(id);
      return { id, title: 'Lot' };
    },
    listBids: async (id: string) => {
      calls.listBids.push(id);
      return { data: [{ id: 'bid-1' }] };
    },
    listExpertAppraisals: async (id: string) => {
      calls.listExpertAppraisals.push(id);
      return { data: [{ id: 'appraisal-1' }] };
    },
    getSellerMeta: async (sellerId: string) => {
      calls.getSellerMeta.push(sellerId);
      return { sellerId, lotsCreatedToday };
    },
    createAuction: async (body: Record<string, unknown>) => {
      calls.createAuction.push(body);
      return { id: 'new-lot', ...body };
    },
  } as unknown as AuctionClient;

  const auctionPlanPolicy = {
    resolveSearchScope: async () => {
      if (planId === 'pro') return 'FULL_TEXT,FILTERS' as const;
      if (planId === 'basic') return 'FULL_TEXT' as const;
      return 'TITLE' as const;
    },
    resolveSellerPlanOptions: async (_userId: string, used: number) => {
      const base =
        planId === 'free'
          ? freeSellerOptions(used)
          : {
              ...buildSellerPlanOptions({
                planId,
                allowedTypes: ['ENGLISH', 'DUTCH'],
                maxDurationHours: planId === 'pro' ? null : 336,
                promotionEnabled: planId === 'pro',
                reserveEnabled: planId === 'pro',
                dailyLimit: planId === 'pro' ? null : 10,
                promotionUnitPrice: 200,
                reserveUnitPrice: 100,
              }),
              dailyLimitSummary:
                planId === 'pro'
                  ? { limit: null, used, remaining: null }
                  : { limit: 10, used, remaining: Math.max(0, 10 - used) },
            };
      return base;
    },
    resolveSellerPlanOptionsForDisplay: async (_userId: string, used: number) => {
      const base =
        planId === 'free'
          ? freeSellerOptions(used)
          : {
              ...buildSellerPlanOptions({
                planId,
                allowedTypes: ['ENGLISH', 'DUTCH'],
                maxDurationHours: planId === 'pro' ? null : 336,
                promotionEnabled: planId === 'pro',
                reserveEnabled: planId === 'pro',
                dailyLimit: planId === 'pro' ? null : 10,
                promotionUnitPrice: 200,
                reserveUnitPrice: 100,
              }),
              dailyLimitSummary:
                planId === 'pro'
                  ? { limit: null, used, remaining: null }
                  : { limit: 10, used, remaining: Math.max(0, 10 - used) },
            };
      return { ...base, degraded: false };
    },
  } as unknown as AuctionPlanPolicyService;

  const mediaLimits = {
    getLimits: async () => ({
      countMax: 3,
      sizeMaxMb: 3,
      sizeMaxBytes: 3 * 1024 * 1024,
      accept: 'image/*',
    }),
  } as unknown as MediaLimitsService;

  const mediaStorage = {
    publicBaseUrl: () => 'http://localhost:9000',
  } as unknown as MediaStorageService;
  const billing = {
    charge: async (body: Record<string, unknown>) => {
      calls.charges.push(body);
      return { transactionId: `tx-${calls.charges.length}`, status: 'ok', balanceAfter: 0 };
    },
  } as unknown as BillingClient;

  const controller = new AuctionController(
    auction,
    auctionPlanPolicy,
    mediaLimits,
    mediaStorage,
    billing,
  );

  return { controller, calls };
}

describe('AuctionController (integration)', () => {
  it('GET list applies free-plan search policy and strips pro filters', async () => {
    const { controller, calls } = createHarness('free');

    const result = await controller.list(USER, {
      q: 'coin',
      status: 'ACTIVE',
      minPrice: 100,
      maxPrice: 500,
      type: 'ENGLISH',
      hasExpertAppraisal: true,
      limit: 10,
    });

    assert.equal(calls.listAuctions.length, 1);
    assert.deepEqual(calls.listAuctions[0], {
      q: 'coin',
      status: 'ACTIVE',
      limit: 10,
      searchMode: 'TITLE',
    });
    assert.equal(result.meta.searchScope, 'TITLE');
    assert.deepEqual(result.items, [{ id: 'lot-1' }]);
  });

  it('GET list keeps pro filters for pro plan', async () => {
    const { controller, calls } = createHarness('pro');

    await controller.list(USER, {
      minPrice: 50,
      maxPrice: 200,
      type: 'DUTCH',
      hasExpertAppraisal: true,
    });

    assert.deepEqual(calls.listAuctions[0], {
      minPrice: 50,
      maxPrice: 200,
      type: 'DUTCH',
      hasExpertAppraisal: true,
      searchMode: 'FULL_TEXT',
    });
  });

  it('GET :id proxies to auction service', async () => {
    const { controller, calls } = createHarness('free');

    const result = await controller.getById('lot-42');

    assert.deepEqual(calls.getAuction, ['lot-42']);
    assert.deepEqual(result, { id: 'lot-42', title: 'Lot' });
  });

  it('GET :id/bids proxies to auction service', async () => {
    const { controller, calls } = createHarness('free');

    const result = await controller.listBids('lot-42');

    assert.deepEqual(calls.listBids, ['lot-42']);
    assert.deepEqual(result, { data: [{ id: 'bid-1' }] });
  });

  it('GET :id/expert-appraisals proxies to auction service', async () => {
    const { controller, calls } = createHarness('free');

    const result = await controller.listExpertAppraisals('lot-42');

    assert.deepEqual(calls.listExpertAppraisals, ['lot-42']);
    assert.deepEqual(result, { data: [{ id: 'appraisal-1' }] });
  });

  it('GET create-options merges plan options with seller meta', async () => {
    const { controller, calls } = createHarness('free', 1);

    const result = await controller.createOptions(USER);

    assert.deepEqual(calls.getSellerMeta, ['seller-1']);
    assert.equal(result.planId, 'free');
    assert.deepEqual(result.allowedTypes, ['ENGLISH']);
    assert.deepEqual(result.dailyLimit, { limit: 3, used: 1, remaining: 2 });
    assert.equal(result.imageLimits?.countMax, 3);
  });

  it('POST create applies seller policy and forwards sellerId', async () => {
    const { controller, calls } = createHarness('free', 0);

    const result = await controller.create(USER, validCreateBody);

    assert.equal(calls.createAuction.length, 1);
    const payload = calls.createAuction[0];
    assert.equal(payload.sellerId, 'seller-1');
    assert.equal(result.id, 'new-lot');
  });

  it('POST create rejects paid options unavailable on the current plan', async () => {
    const { controller } = createHarness('free', 0);

    await assert.rejects(
      () =>
        controller.create(USER, {
          ...validCreateBody,
          promote: true,
        }),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it('POST create charges enabled paid options before creating', async () => {
    const { controller, calls } = createHarness('pro', 0);

    await controller.create(
      USER,
      {
        ...validCreateBody,
        promote: true,
        reservePrice: 500,
      },
      'request-1',
    );

    assert.deepEqual(
      calls.charges.map((charge) => charge.target),
      ['auction.promotion', 'auction.reservePrice'],
    );
    assert.equal(calls.createAuction.length, 1);
  });

  it('POST create returns 403 when daily limit is reached', async () => {
    const { controller } = createHarness('free', 3);

    await assert.rejects(
      () => controller.create(USER, validCreateBody),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
});
