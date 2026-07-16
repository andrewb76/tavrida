import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export type NovuTriggerResult = {
  transactionId: string;
  mode: 'novu' | 'mock';
};

/**
 * Thin Novu HTTP client. Without NOVU_API_KEY — mock transaction (local/dev).
 * Spec: ADR-004 adapter · ADR-019 self-host default URL.
 */
@Injectable()
export class NovuAdapter {
  private readonly logger = new Logger(NovuAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('NOVU_API_KEY')?.trim());
  }

  async trigger(input: {
    workflowId: string;
    subscriberId: string;
    payload?: Record<string, unknown>;
    email?: string | null;
  }): Promise<NovuTriggerResult> {
    const apiKey = this.config.get<string>('NOVU_API_KEY')?.trim();
    if (!apiKey) {
      const transactionId = `mock-${randomUUID()}`;
      this.logger.debug(
        `mock trigger workflow=${input.workflowId} subscriber=${input.subscriberId} tx=${transactionId}`,
      );
      return { transactionId, mode: 'mock' };
    }

    const base = (
      this.config.get<string>('NOVU_API_URL') ?? 'http://localhost:3020'
    ).replace(/\/$/, '');

    const body: Record<string, unknown> = {
      name: input.workflowId,
      to: {
        subscriberId: input.subscriberId,
        ...(input.email ? { email: input.email } : {}),
      },
      payload: input.payload ?? {},
    };

    const res = await fetch(`${base}/v1/events/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Novu trigger failed: ${res.status} ${detail.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      data?: { transactionId?: string };
      transactionId?: string;
    };
    const transactionId =
      json.data?.transactionId ?? json.transactionId ?? `novu-${randomUUID()}`;
    return { transactionId, mode: 'novu' };
  }
}
