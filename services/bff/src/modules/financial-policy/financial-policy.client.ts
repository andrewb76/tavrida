import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PlanSummary = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
};

export type UserSubscription = {
  userId: string;
  planId: string;
  status: string;
  autoRenew: boolean;
  startsAt: string | null;
  expiresAt: string | null;
};

@Injectable()
export class FinancialPolicyClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('FINANCIAL_POLICY_URL') ?? 'http://localhost:3002';
    return url.replace(/\/$/, '');
  }

  async listPlans() {
    const res = await this.request<{ data: PlanSummary[] }>('GET', '/internal/v1/plans');
    return res.data;
  }

  async getSubscription(userId: string) {
    const qs = new URLSearchParams({ userId });
    return this.request<UserSubscription>('GET', `/internal/v1/subscription?${qs}`);
  }

  async activatePlan(body: {
    userId: string;
    planId: string;
    autoRenew?: boolean;
    billingPeriod?: 'monthly' | 'yearly';
  }) {
    return this.request<UserSubscription & { billingCharged?: boolean }>(
      'POST',
      '/internal/v1/subscription/activate',
      body,
    );
  }

  async checkLimit(body: {
    userId: string;
    parameterKey: string;
    requestedValue: number;
    currentUsage: number;
  }) {
    return this.request<{
      allowed: boolean;
      planId: string;
      limit: number | null;
      remaining: number | null;
    }>('POST', '/internal/v1/limits/check', body);
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
        detail: `financial-policy ${method} ${path}: ${detail}`,
      };

      if (res.status === 404) throw new NotFoundException(errBody);
      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as T;
  }
}
