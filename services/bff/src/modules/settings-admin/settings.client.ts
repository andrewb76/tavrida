import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { internalServiceHeaders } from '@tavrida/internal-auth';

const SETTINGS_URL = process.env.SETTINGS_URL ?? 'http://localhost:3020';
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

@Injectable()
export class SettingsClient {
  private readonly logger = new Logger(SettingsClient.name);

  async listPlans(): Promise<unknown[]> {
    return this.request('GET', '/internal/v1/plans/all');
  }

  async listAllPlans(): Promise<unknown[]> {
    return this.request('GET', '/internal/v1/plans/all');
  }

  async createPlan(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/plans', body);
  }

  async updatePlan(id: string, body: unknown): Promise<unknown> {
    return this.request('PATCH', `/internal/v1/plans/${id}`, body);
  }

  async deletePlan(id: string): Promise<void> {
    return this.request('DELETE', `/internal/v1/plans/${id}`);
  }

  async listParameters(service?: string, category?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (service) params.set('service', service);
    if (category) params.set('category', category);
    const qs = params.toString() ? `?${params}` : '';
    return this.request('GET', `/internal/v1/parameters${qs}`);
  }

  async getParameter(key: string): Promise<unknown> {
    return this.request('GET', `/internal/v1/parameters/${encodeURIComponent(key)}`);
  }

  async listServices(): Promise<unknown[]> {
    const all = await this.request<unknown[]>('GET', '/internal/v1/parameters');
    const map = new Map<string, number>();
    for (const p of all) {
      const svc = (p as Record<string, unknown>).service as string;
      map.set(svc, (map.get(svc) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, parameterCount]) => ({ name, parameterCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async registerParameter(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/parameters/register', body);
  }

  async updateParameter(key: string, body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/parameters/register', {
      ...(body as Record<string, unknown>),
      key,
    });
  }

  async deleteParameter(key: string): Promise<void> {
    return this.request('DELETE', `/internal/v1/parameters/${key}`);
  }

  async getSystemValues(domain: string): Promise<unknown> {
    return this.request('GET', `/internal/v1/system-values/${domain}`);
  }

  async patchSystemValues(domain: string, body: unknown): Promise<unknown> {
    return this.request('POST', `/internal/v1/system-values/${domain}`, body);
  }

  async getAllSystemValues(): Promise<unknown[]> {
    const allParams = await this.request<unknown[]>('GET', '/internal/v1/parameters');
    const domains = new Set<string>();
    for (const p of allParams) {
      const svc = (p as Record<string, unknown>).service as string;
      domains.add(svc);
    }
    const results: unknown[] = [];
    for (const domain of domains) {
      try {
        const vals = await this.request<unknown[]>(`GET`, `/internal/v1/system-values/${domain}`);
        if (Array.isArray(vals)) results.push(...vals);
      } catch { /* domain may have no system values */ }
    }
    return results;
  }

  async getUserValues(userId: string): Promise<unknown> {
    return this.request('GET', `/internal/v1/user-values/${userId}`);
  }

  async getUserValue(userId: string, key: string): Promise<unknown> {
    return this.request('GET', `/internal/v1/user-values/${userId}/${key}`);
  }

  async setUserValue(userId: string, key: string, body: unknown): Promise<unknown> {
    return this.request('PATCH', `/internal/v1/user-values/${userId}/${key}`, body);
  }

  async deleteUserValue(userId: string, key: string): Promise<void> {
    return this.request('DELETE', `/internal/v1/user-values/${userId}/${key}`);
  }

  async getPlanValues(planId?: string): Promise<unknown> {
    const qs = planId ? `?planId=${encodeURIComponent(planId)}` : '';
    return this.request('GET', `/internal/v1/plan-values${qs}`);
  }

  async setPlanValue(planId: string, key: string, body: unknown): Promise<unknown> {
    return this.request('PATCH', `/internal/v1/plan-values/${planId}/${key}`, body);
  }

  async resolvePrice(body: Record<string, unknown>): Promise<unknown> {
    return this.request('GET', `/internal/v1/plan-values/resolve-price?${new URLSearchParams(body as Record<string, string>)}`);
  }

  async getLimitState(userId: string, key?: string): Promise<unknown> {
    const qs = new URLSearchParams({ userId });
    if (key) qs.set('key', key);
    return this.request('GET', `/internal/v1/limits/state?${qs}`);
  }

  async getUserLimits(planId?: string): Promise<unknown> {
    const qs = planId ? `?planId=${encodeURIComponent(planId)}` : '';
    return this.request('GET', `/internal/v1/limits/state${qs}`);
  }

  async getUserLimitsByUser(userId: string): Promise<unknown> {
    return this.request('GET', `/internal/v1/limits/state?userId=${encodeURIComponent(userId)}`);
  }

  async grantLimit(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/limits/grant', body);
  }

  async checkLimit(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/limits/check', body);
  }

  async consumeLimit(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/limits/consume', body);
  }

  async getUsageLog(params: Record<string, string>): Promise<unknown> {
    return this.request('GET', `/internal/v1/limits/usage-log?${new URLSearchParams(params)}`);
  }

  async listSubscriptions(): Promise<unknown> {
    return this.request('GET', '/internal/v1/subscriptions');
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${SETTINGS_URL}${path}`;
    const headers = {
      ...internalServiceHeaders(TOKEN),
      'Content-Type': 'application/json',
    };

    this.logger.debug(`SettingsClient ${method} ${path}`);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(5_000),
      });

      if (res.status === 204 || res.status === 200) {
        const text = await res.text();
        return text ? JSON.parse(text) : (undefined as T);
      }

      const payload = await res.json().catch(() => ({}));
      const detail = payload?.detail ?? payload?.message ?? res.statusText;

      if (res.status === 404) {
        throw new NotFoundException(`settings ${method} ${path}: ${detail}`);
      }
      throw new HttpException(
        { type: 'bad-gateway', detail: `settings ${method} ${path}: ${detail}` },
        res.status,
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`SettingsClient ${method} ${path} failed`, err);
      throw new BadGatewayException(
        `settings ${method} ${path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
