import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenException } from '@nestjs/common';

import type { AuthUser } from '../auth/current-user.decorator';
import type { PlanConfigClient } from '../plan-config/plan-config.client';
import type { MediaLimitsService } from '../media/media-limits.service';
import type { MediaStorageService } from '../media/media-storage.service';
import { AuctionController } from './auction.controller';
import type { AuctionClient } from './auction.client';

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

function createHarness(planId: string, lotsCreatedToday = 0) {
  const calls = {
    listAuctions: [] as Record<string, unknown>[],
    createAuction: [] as Record<string, unknown>[],
    getAuction: [] as string[],
    listBids: [] as string[],
    listExpertAppraisals: [] as string[],
    getSellerMeta: [] as string[],
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

  const planConfig = {
    getSubscription: async (userId: string) => {
      assert.equal(userId, USER.sub);
      return { planId };
    },
  } as unknown as PlanConfigClient;

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

  const controller = new AuctionController(auction, planConfig, mediaLimits, mediaStorage);

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

    const result = await controller.create(USER, {
      ...validCreateBody,
      promote: true,
      reservePrice: 500,
    });

    assert.equal(calls.createAuction.length, 1);
    const payload = calls.createAuction[0];
    assert.equal(payload.sellerId, 'seller-1');
    assert.equal(payload.promote, false);
    assert.equal(payload.reservePrice, undefined);
    assert.equal(result.id, 'new-lot');
  });

  it('POST create returns 403 when daily limit is reached', async () => {
    const { controller } = createHarness('free', 3);

    await assert.rejects(
      () => controller.create(USER, validCreateBody),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
});
