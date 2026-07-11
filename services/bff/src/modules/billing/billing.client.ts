import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WalletBalance = {
  userId: string;
  balance: number;
  currency: string;
};

export type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  target: string | null;
  createdAt: string;
};

@Injectable()
export class BillingClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('BILLING_URL') ?? 'http://localhost:3001';
    return url.replace(/\/$/, '');
  }

  async getBalance(userId: string) {
    const qs = new URLSearchParams({ userId });
    return this.request<WalletBalance>('GET', `/internal/v1/wallets/balance?${qs}`);
  }

  async listTransactions(userId: string, limit = 20) {
    const qs = new URLSearchParams({ userId, limit: String(limit) });
    return this.request<WalletTransaction[]>('GET', `/internal/v1/wallets/transactions?${qs}`);
  }

  async deposit(body: { userId: string; amount: number; description?: string }) {
    return this.request<{ transactionId: string; status: string; balanceAfter: number }>(
      'POST',
      '/internal/v1/wallets/deposit',
      body,
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
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
        type: typeof payload.type === 'string' ? payload.type : 'upstream-error',
        detail: `billing ${method} ${path}: ${detail}`,
      };

      if (res.status === 404) throw new NotFoundException(errBody);
      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as T;
  }
}
