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

  async listParameters(service?: string): Promise<unknown> {
    const qs = service ? `?service=${encodeURIComponent(service)}` : '';
    return this.request('GET', `/internal/v1/parameters${qs}`);
  }

  async registerParameter(body: unknown): Promise<unknown> {
    return this.request('POST', '/internal/v1/parameters/register', body);
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
