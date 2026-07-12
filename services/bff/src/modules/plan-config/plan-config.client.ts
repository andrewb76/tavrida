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

export type TierValue = {
  limitValue: number | null;
  isFeatureEnabled: boolean;
  enumValues: string[] | null;
  priceAmount: number | null;
  isEnabled: boolean;
};

export type PlanVariableRow = {
  key: string;
  service: string;
  name: string;
  description: string;
  valueType: 'limit' | 'feature' | 'enum' | 'price';
  syncStatus: 'active' | 'stale';
  tiers: Record<string, TierValue>;
};

@Injectable()
export class PlanConfigClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('PLAN_CONFIG_URL') ?? 'http://localhost:3002';
    return url.replace(/\/$/, '');
  }

  async listPlans() {
    const res = await this.request<{ data: PlanSummary[] }>('GET', '/internal/v1/plans');
    return res.data;
  }

  async listAllPlans() {
    const res = await this.request<{ data: PlanSummary[] }>('GET', '/internal/v1/plans/all');
    return res.data;
  }

  async updatePlan(
    planId: string,
    patch: {
      title?: string;
      description?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      isActive?: boolean;
    },
  ) {
    const res = await this.request<{ data: PlanSummary }>('PATCH', `/internal/v1/plans/${planId}`, patch);
    return res.data;
  }

  async listVariables() {
    const res = await this.request<{ data: PlanVariableRow[] }>('GET', '/internal/v1/plan-variables');
    return res.data;
  }

  async patchVariable(
    variableKey: string,
    tierValues: Record<
      string,
      {
        limitValue?: number | null;
        isFeatureEnabled?: boolean;
        enumValues?: string[] | null;
        priceAmount?: number | null;
        isEnabled?: boolean;
      }
    >,
  ) {
    return this.request<{ key: string; updated: boolean }>(
      'PATCH',
      `/internal/v1/plan-variables/${encodeURIComponent(variableKey)}`,
      { tierValues },
    );
  }

  async deleteVariable(variableKey: string) {
    return this.request<{ key: string; deleted: boolean }>(
      'DELETE',
      `/internal/v1/plan-variables/${encodeURIComponent(variableKey)}`,
    );
  }

  async resolvePrice(userId: string, key: string) {
    const qs = new URLSearchParams({ userId, key });
    return this.request<{
      key: string;
      planId: string;
      amount: number;
      currency: string;
      name: string;
    }>('GET', `/internal/v1/plan-variables/resolve-price?${qs}`);
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
    return this.request<UserSubscription & { billingCharged?: boolean; transactionId?: string }>(
      'POST',
      '/internal/v1/subscription/activate',
      body,
    );
  }

  async cancelAutoRenew(userId: string) {
    return this.request<{ userId: string; autoRenew: boolean; updated: boolean }>(
      'POST',
      '/internal/v1/subscription/cancel-auto-renew',
      { userId },
    );
  }

  async checkLimit(body: {
    userId: string;
    variableKey: string;
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

  async resolveLimitValue(userId: string, variableKey: string): Promise<number | null> {
    const result = await this.checkLimit({
      userId,
      variableKey,
      requestedValue: 0,
      currentUsage: 0,
    });
    return result.limit;
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
        detail: `plan-config ${method} ${path}: ${detail}`,
      };

      if (res.status === 404) throw new NotFoundException(errBody);
      if (res.status >= 500) throw new ServiceUnavailableException(errBody);
      throw new HttpException(errBody, res.status);
    }

    return (await res.json()) as T;
  }
}
