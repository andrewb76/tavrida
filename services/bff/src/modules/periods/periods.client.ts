import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

@Injectable()
export class PeriodsClient {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('PERIODS_URL') ?? 'http://localhost:3014';
    return url.replace(/\/$/, '');
  }

  listCategories(activeOnly?: boolean) {
    const qs = activeOnly ? '?activeOnly=true' : '';
    return this.request<{ data: unknown[] }>('GET', `/internal/v1/periods/categories${qs}`);
  }

  getCategory(id: string) {
    return this.request<unknown>('GET', `/internal/v1/periods/categories/${id}`);
  }

  createCategory(body: unknown) {
    return this.request<unknown>('POST', '/internal/v1/periods/categories', body);
  }

  updateCategory(id: string, body: unknown) {
    return this.request<unknown>('PATCH', `/internal/v1/periods/categories/${id}`, body);
  }

  removeCategory(id: string) {
    return this.request<{ ok: true }>('DELETE', `/internal/v1/periods/categories/${id}`);
  }

  listPeriods(query: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.set(k, v);
    }
    const qs = params.toString();
    return this.request<{ data: unknown[] }>(
      'GET',
      `/internal/v1/periods${qs ? `?${qs}` : ''}`,
    );
  }

  getPeriod(id: string) {
    return this.request<unknown>('GET', `/internal/v1/periods/${id}`);
  }

  createPeriod(body: unknown) {
    return this.request<unknown>('POST', '/internal/v1/periods', body);
  }

  updatePeriod(id: string, body: unknown) {
    return this.request<unknown>('PATCH', `/internal/v1/periods/${id}`, body);
  }

  removePeriod(id: string) {
    return this.request<{ ok: true }>('DELETE', `/internal/v1/periods/${id}`);
  }

  replaceChildren(id: string, children: unknown[]) {
    return this.request<{ data: unknown[] }>('PUT', `/internal/v1/periods/${id}/children`, {
      children,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: internalServiceHeaders(
          this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
          body ? { 'Content-Type': 'application/json' } : {},
        ),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException('periods unavailable');
    }

    if (!res.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (res.status === 404) {
        throw new NotFoundException(payload['message'] ?? 'Not found');
      }
      throw new HttpException(payload['message'] ?? payload ?? res.statusText, res.status);
    }

    return (await res.json()) as T;
  }
}
