import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { PlanVariableEntity } from '../../entities/plan-variable.entity';
import { PlanVariableTierEntity } from '../../entities/plan-variable-tier.entity';
import { PlanVariablesService } from './plan-variables.service';

function createPlanVariablesHarness(seed: {
  variables?: PlanVariableEntity[];
  tiers?: PlanVariableTierEntity[];
}) {
  const variables = [...(seed.variables ?? [])];
  const tiers = [...(seed.tiers ?? [])];

  const variablesRepo = {
    findOne: async ({ where }: { where: { key: string } }) =>
      variables.find((row) => row.key === where.key) ?? null,
    find: async ({ where }: { where?: { service?: string } } = {}) => {
      if (where?.service) {
        return variables.filter((row) => row.service === where.service);
      }
      return [...variables];
    },
    create: (data: Partial<PlanVariableEntity>) => ({ ...data }) as PlanVariableEntity,
    save: async (row: PlanVariableEntity) => {
      const index = variables.findIndex((item) => item.key === row.key);
      if (index >= 0) {
        variables[index] = row;
      } else {
        variables.push(row);
      }
      return row;
    },
    delete: async ({ key }: { key: string }) => {
      const index = variables.findIndex((row) => row.key === key);
      if (index >= 0) variables.splice(index, 1);
    },
  } as unknown as Repository<PlanVariableEntity>;

  const tiersRepo = {
    findOne: async ({ where }: { where: { planId: string; variableKey: string } }) =>
      tiers.find(
        (row) => row.planId === where.planId && row.variableKey === where.variableKey,
      ) ?? null,
    find: async () => [...tiers],
    create: (data: Partial<PlanVariableTierEntity>) => ({ ...data }) as PlanVariableTierEntity,
    save: async (row: PlanVariableTierEntity) => {
      const index = tiers.findIndex(
        (item) => item.planId === row.planId && item.variableKey === row.variableKey,
      );
      if (index >= 0) {
        tiers[index] = row;
      } else {
        tiers.push(row);
      }
      return row;
    },
    delete: async () => undefined,
  } as unknown as Repository<PlanVariableTierEntity>;

  const service = new PlanVariablesService(variablesRepo, tiersRepo);

  return { service, variables, tiers };
}

const promotionVariable: PlanVariableEntity = {
  key: 'auction.seller.promotion.unitPrice',
  service: 'auction',
  name: 'Promotion',
  description: '',
  valueType: 'price',
  minValue: null,
  defaultValue: null,
  maxValue: null,
  syncStatus: 'active',
};

describe('PlanVariablesService', () => {
  describe('resolvePrice', () => {
    it('returns price for enabled tier', async () => {
      const { service } = createPlanVariablesHarness({
        variables: [promotionVariable],
        tiers: [
          {
            planId: 'pro',
            variableKey: promotionVariable.key,
            limitValue: null,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: '200.00',
            isEnabled: true,
          },
        ],
      });

      const result = await service.resolvePrice('pro', promotionVariable.key);
      assert.deepEqual(result, {
        key: promotionVariable.key,
        planId: 'pro',
        amount: 200,
        currency: 'RUB',
        name: 'Promotion',
      });
    });

    it('rejects non-price variables', async () => {
      const { service } = createPlanVariablesHarness({
        variables: [
          {
            ...promotionVariable,
            valueType: 'limit',
            key: 'auction.bidder.participation.activeMax',
          },
        ],
      });

      await assert.rejects(
        () => service.resolvePrice('pro', 'auction.bidder.participation.activeMax'),
        NotFoundException,
      );
    });

    it('rejects disabled tiers', async () => {
      const { service } = createPlanVariablesHarness({
        variables: [promotionVariable],
        tiers: [
          {
            planId: 'free',
            variableKey: promotionVariable.key,
            limitValue: null,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: '200.00',
            isEnabled: false,
          },
        ],
      });

      await assert.rejects(
        () => service.resolvePrice('free', promotionVariable.key),
        ForbiddenException,
      );
    });

    it('rejects zero price amounts', async () => {
      const { service } = createPlanVariablesHarness({
        variables: [promotionVariable],
        tiers: [
          {
            planId: 'free',
            variableKey: promotionVariable.key,
            limitValue: null,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: '0.00',
            isEnabled: true,
          },
        ],
      });

      await assert.rejects(
        () => service.resolvePrice('free', promotionVariable.key),
        ForbiddenException,
      );
    });
  });

  describe('patchMatrix', () => {
    it('updates tier values by plan id', async () => {
      const variableKey = 'forum.author.attachment.countMax';
      const { service, tiers } = createPlanVariablesHarness({
        variables: [
          {
            key: variableKey,
            service: 'forum',
            name: 'Attachments',
            description: '',
            valueType: 'limit',
            minValue: null,
            defaultValue: null,
            maxValue: null,
            syncStatus: 'active',
          },
        ],
        tiers: [
          {
            planId: 'free',
            variableKey,
            limitValue: 1,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: null,
            isEnabled: true,
          },
          {
            planId: 'basic',
            variableKey,
            limitValue: 3,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: null,
            isEnabled: true,
          },
          {
            planId: 'pro',
            variableKey,
            limitValue: -1,
            isFeatureEnabled: false,
            enumValues: null,
            priceAmount: null,
            isEnabled: true,
          },
        ],
      });

      await service.patchMatrix(variableKey, {
        free: { limitValue: 2 },
        basic: { limitValue: 4 },
        pro: { limitValue: 10 },
      });

      assert.equal(tiers.find((row) => row.planId === 'free')?.limitValue, 2);
      assert.equal(tiers.find((row) => row.planId === 'basic')?.limitValue, 4);
      assert.equal(tiers.find((row) => row.planId === 'pro')?.limitValue, 10);
    });
  });

  describe('sync', () => {
    it('marks variables missing from manifest as stale', async () => {
      const { service, variables } = createPlanVariablesHarness({
        variables: [
          {
            key: 'auction.seller.promotion.unitPrice',
            service: 'auction',
            name: 'Promotion',
            description: '',
            valueType: 'price',
            minValue: null,
            defaultValue: null,
            maxValue: null,
            syncStatus: 'active',
          },
          {
            key: 'auction.seller.reserve.unitPrice',
            service: 'auction',
            name: 'Reserve',
            description: '',
            valueType: 'price',
            minValue: null,
            defaultValue: null,
            maxValue: null,
            syncStatus: 'active',
          },
        ],
      });

      const result = await service.sync({
        service: 'auction',
        variables: [
          {
            key: 'auction.seller.promotion.unitPrice',
            service: 'auction',
            name: 'Promotion',
            valueType: 'price',
          },
        ],
      });

      assert.equal(result.synced, 1);
      assert.deepEqual(result.stale, ['auction.seller.reserve.unitPrice']);
      assert.equal(
        variables.find((row) => row.key === 'auction.seller.reserve.unitPrice')?.syncStatus,
        'stale',
      );
      assert.equal(
        variables.find((row) => row.key === 'auction.seller.promotion.unitPrice')?.syncStatus,
        'active',
      );
    });
  });
});
