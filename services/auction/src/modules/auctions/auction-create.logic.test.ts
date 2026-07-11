import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { validateCreateAuction, resolveInitialStatus } from './auction-create.logic';

describe('auction-create.logic', () => {
  it('resolveInitialStatus picks SCHEDULED for future start', () => {
    const future = new Date(Date.now() + 60_000);
    assert.equal(resolveInitialStatus(future), 'SCHEDULED');
  });

  it('validateCreateAuction rejects short title', () => {
    assert.throws(
      () =>
        validateCreateAuction({
          sellerId: 'u1',
          title: 'ab',
          description: '1234567890',
          type: 'ENGLISH',
          startingPrice: 100,
          bidIncrement: 10,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 3600_000).toISOString(),
        }),
      BadRequestException,
    );
  });
});
