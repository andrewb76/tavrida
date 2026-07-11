import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HttpException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { TransactionEntity } from '../../entities/transaction.entity';
import { UserWalletEntity } from '../../entities/user-wallet.entity';
import { WalletsService } from './wallets.service';

type WalletRow = UserWalletEntity;
type TransactionRow = TransactionEntity;

function createTestHarness(initialBalance = 0) {
  const wallets = new Map<string, WalletRow>();
  const transactions: TransactionRow[] = [];

  if (initialBalance > 0) {
    wallets.set('user-1', {
      userId: 'user-1',
      balance: initialBalance.toFixed(2),
      currency: 'RUB',
    } as WalletRow);
  }

  const manager = {
    async findOne(entity: unknown, options: { where: { userId: string } }) {
      if (entity !== UserWalletEntity) return null;
      return wallets.get(options.where.userId) ?? null;
    },
    create(entity: unknown, data: Partial<WalletRow | TransactionRow>) {
      if (entity === UserWalletEntity) {
        return { ...data } as WalletRow;
      }
      return { ...data } as TransactionRow;
    },
    async save(row: WalletRow | TransactionRow) {
      if ('balance' in row && 'currency' in row) {
        wallets.set(row.userId, row);
        return row;
      }
      const existing = transactions.findIndex((tx) => tx.id === row.id);
      if (existing >= 0) {
        transactions[existing] = row as TransactionRow;
      } else {
        transactions.push(row as TransactionRow);
      }
      return row;
    },
  };

  const walletsRepo = {
    findOne: async ({ where }: { where: { userId: string } }) =>
      wallets.get(where.userId) ?? null,
  } as unknown as Repository<UserWalletEntity>;

  const transactionsRepo = {
    findOne: async ({
      where,
    }: {
      where: { userId: string; idempotencyKey?: string };
    }) =>
      transactions.find(
        (tx) =>
          tx.userId === where.userId &&
          (where.idempotencyKey == null || tx.idempotencyKey === where.idempotencyKey),
      ) ?? null,
    find: async () => transactions.filter((tx) => tx.status === 'COMPLETED'),
  } as unknown as Repository<TransactionEntity>;

  const dataSource = {
    transaction: async <T>(fn: (m: typeof manager) => Promise<T>) => fn(manager),
  } as unknown as DataSource;

  const service = new WalletsService(walletsRepo, transactionsRepo, dataSource);

  return { service, wallets, transactions };
}

describe('WalletsService', () => {
  it('getBalance returns zero for a new user', async () => {
    const { service } = createTestHarness();
    const result = await service.getBalance('new-user');
    assert.deepEqual(result, { userId: 'new-user', balance: 0, currency: 'RUB' });
  });

  it('deposit rejects amounts below minimum', async () => {
    const { service } = createTestHarness();
    await assert.rejects(
      () => service.deposit({ userId: 'user-1', amount: 50 }),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 400);
        return true;
      },
    );
  });

  it('deposit creates wallet and credits balance', async () => {
    const { service, wallets } = createTestHarness();
    const result = await service.deposit({ userId: 'user-1', amount: 500 });

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.balanceAfter, 500);
    assert.equal(Number(wallets.get('user-1')?.balance), 500);
  });

  it('charge rejects non-positive amounts', async () => {
    const { service } = createTestHarness(500);
    await assert.rejects(
      () =>
        service.charge({
          userId: 'user-1',
          amount: 0,
          target: 'auction.seller.promotion.unitPrice',
          description: 'Promotion',
        }),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 400);
        return true;
      },
    );
  });

  it('charge debits balance on success', async () => {
    const { service, wallets } = createTestHarness(500);
    const result = await service.charge({
      userId: 'user-1',
      amount: 200,
      target: 'auction.seller.promotion.unitPrice',
      description: 'Promotion',
    });

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.balanceAfter, 300);
    assert.equal(Number(wallets.get('user-1')?.balance), 300);
  });

  it('charge with insufficient balance records FAILED tx and throws 402', async () => {
    const { service, transactions } = createTestHarness(100);
    await assert.rejects(
      () =>
        service.charge({
          userId: 'user-1',
          amount: 200,
          target: 'auction.seller.promotion.unitPrice',
          description: 'Promotion',
        }),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 402);
        const body = error.getResponse() as { balance: number; required: number };
        assert.equal(body.balance, 100);
        assert.equal(body.required, 200);
        return true;
      },
    );

    assert.equal(transactions.length, 1);
    assert.equal(transactions[0]?.status, 'FAILED');
    assert.equal(transactions[0]?.type, 'CHARGE');
  });

  it('charge is idempotent for the same idempotency key', async () => {
    const { service, wallets, transactions } = createTestHarness(500);

    const first = await service.charge({
      userId: 'user-1',
      amount: 200,
      target: 'auction.seller.promotion.unitPrice',
      description: 'Promotion',
      idempotencyKey: 'idem-1',
    });

    const second = await service.charge({
      userId: 'user-1',
      amount: 200,
      target: 'auction.seller.promotion.unitPrice',
      description: 'Promotion',
      idempotencyKey: 'idem-1',
    });

    assert.equal(second.transactionId, first.transactionId);
    assert.equal(Number(wallets.get('user-1')?.balance), 300);
    assert.equal(transactions.filter((tx) => tx.status === 'COMPLETED').length, 1);
  });
});
