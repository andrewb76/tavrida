import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { internalServiceHeaders } from '@tavrida/internal-auth';

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
      headers: internalServiceHeaders(this.config.get<string>('INTERNAL_SERVICE_TOKEN'), {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({
        userId: input.userId,
        amount: input.amount,
        target: input.target,
        description: input.description,
      }),
    });

    if (!res.ok) {
      throwPlanConfigBillingError(res, await readBillingErrorPayload(res));
    }

    return (await res.json()) as ChargeResult;
  }
}

async function readBillingErrorPayload(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function billingErrorDetail(payload: Record<string, unknown>, statusText: string): string {
  if (typeof payload.detail === 'string') return payload.detail;
  if (typeof payload.message === 'string') return payload.message;
  if (Array.isArray(payload.message)) return payload.message.join(', ');
  return statusText;
}

function throwPlanConfigBillingError(res: Response, payload: Record<string, unknown>): never {
  const errBody = {
    type: typeof payload.type === 'string' ? payload.type : 'billing-error',
    detail: `billing charge: ${billingErrorDetail(payload, res.statusText)}`,
    balance: typeof payload.balance === 'number' ? payload.balance : undefined,
    required: typeof payload.required === 'number' ? payload.required : undefined,
  };

  if (res.status >= 500) throw new ServiceUnavailableException(errBody);
  throw new HttpException(errBody, res.status);
}
