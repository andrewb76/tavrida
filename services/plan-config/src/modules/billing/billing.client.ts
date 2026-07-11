import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export type ChargeResult = {
  transactionId: string;
  status: string;
  balanceAfter: number;
};

@Injectable()
export class BillingClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('BILLING_URL') ?? 'http://localhost:3001';
    return url.replace(/\/$/, '');
  }

  async charge(input: {
    userId: string;
    amount: number;
    target: string;
    description: string;
    idempotencyKey?: string;
  }): Promise<ChargeResult> {
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    const res = await fetch(`${this.baseUrl()}/internal/v1/wallets/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        userId: input.userId,
        amount: input.amount,
        target: input.target,
        description: input.description,
      }),
    });

    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }

      const detail =
        (typeof payload.detail === 'string' ? payload.detail : undefined) ??
        (typeof payload.message === 'string'
          ? payload.message
          : Array.isArray(payload.message)
            ? payload.message.join(', ')
            : res.statusText);

      const errBody = {
        type: typeof payload.type === 'string' ? payload.type : 'billing-error',
        detail: `billing charge: ${detail}`,
        balance: typeof payload.balance === 'number' ? payload.balance : undefined,
        required: typeof payload.required === 'number' ? payload.required : undefined,
      };

      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as ChargeResult;
  }
}
