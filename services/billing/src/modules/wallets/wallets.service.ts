import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { UserWalletEntity } from '../../entities/user-wallet.entity';

const DEFAULT_CURRENCY = 'RUB';
const MIN_DEPOSIT = 100;

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(UserWalletEntity)
    private readonly wallets: Repository<UserWalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getBalance(userId: string) {
    const wallet = await this.wallets.findOne({ where: { userId } });
    return {
      userId,
      balance: wallet ? Number(wallet.balance) : 0,
      currency: wallet?.currency ?? DEFAULT_CURRENCY,
    };
  }

  async listTransactions(userId: string, limit = 20) {
    const rows = await this.transactions.find({
      where: { userId, status: 'COMPLETED' },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description,
      target: tx.target,
      createdAt: tx.createdAt.toISOString(),
    }));
  }

  async deposit(input: { userId: string; amount: number; description?: string }) {
    if (input.amount < MIN_DEPOSIT) {
      throw new HttpException(
        { type: 'min_deposit', detail: `Минимальное пополнение — ${MIN_DEPOSIT} ₽` },
        400,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      let wallet = await manager.findOne(UserWalletEntity, {
        where: { userId: input.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = manager.create(UserWalletEntity, {
          userId: input.userId,
          balance: '0',
          currency: DEFAULT_CURRENCY,
        });
        await manager.save(wallet);
      }

      const balanceAfter = Number(wallet.balance) + input.amount;
      wallet.balance = balanceAfter.toFixed(2);
      await manager.save(wallet);

      const tx = manager.create(TransactionEntity, {
        id: randomUUID(),
        userId: input.userId,
        type: 'DEPOSIT',
        amount: input.amount.toFixed(2),
        description: input.description ?? 'Пополнение баланса',
        target: null,
        status: 'COMPLETED',
        idempotencyKey: null,
      });
      await manager.save(tx);

      return {
        transactionId: tx.id,
        status: tx.status,
        balanceAfter,
      };
    });
  }

  async charge(input: {
    userId: string;
    amount: number;
    target: string;
    description: string;
    idempotencyKey?: string;
  }) {
    if (input.amount <= 0) {
      throw new HttpException({ type: 'invalid_amount', detail: 'amount must be > 0' }, 400);
    }

    if (input.idempotencyKey) {
      const existing = await this.transactions.findOne({
        where: { userId: input.userId, idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        const wallet = await this.wallets.findOne({ where: { userId: input.userId } });
        return {
          transactionId: existing.id,
          status: existing.status,
          balanceAfter: wallet ? Number(wallet.balance) : 0,
        };
      }
    }

    return this.dataSource.transaction(async (manager) => {
      let wallet = await manager.findOne(UserWalletEntity, {
        where: { userId: input.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = manager.create(UserWalletEntity, {
          userId: input.userId,
          balance: '0',
          currency: DEFAULT_CURRENCY,
        });
        await manager.save(wallet);
      }

      const balance = Number(wallet.balance);
      if (balance < input.amount) {
        const failed = manager.create(TransactionEntity, {
          id: randomUUID(),
          userId: input.userId,
          type: 'CHARGE',
          amount: input.amount.toFixed(2),
          description: input.description,
          target: input.target,
          status: 'FAILED',
          idempotencyKey: input.idempotencyKey ?? null,
        });
        await manager.save(failed);

        throw new HttpException(
          {
            type: 'insufficient_balance',
            detail: `Недостаточно средств: баланс ${balance} ₽, нужно ${input.amount} ₽`,
            balance,
            required: input.amount,
          },
          402,
        );
      }

      const balanceAfter = balance - input.amount;
      wallet.balance = balanceAfter.toFixed(2);
      await manager.save(wallet);

      const tx = manager.create(TransactionEntity, {
        id: randomUUID(),
        userId: input.userId,
        type: 'CHARGE',
        amount: input.amount.toFixed(2),
        description: input.description,
        target: input.target,
        status: 'COMPLETED',
        idempotencyKey: input.idempotencyKey ?? null,
      });
      await manager.save(tx);

      return {
        transactionId: tx.id,
        status: tx.status,
        balanceAfter,
      };
    });
  }
}
