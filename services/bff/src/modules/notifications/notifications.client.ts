import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { internalServiceHeaders } from '@tavrida/internal-auth';

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Best-effort HTTP client for `services/notifications` (may be absent locally).
 * Never throws — fan-out must not fail the primary write path.
 */
@Injectable()
export class NotificationsClient {
  private readonly logger = new Logger(NotificationsClient.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string | null {
    const url = this.config.get<string>('NOTIFICATIONS_URL')?.trim();
    if (!url) return null;
    return url.replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    return internalServiceHeaders(this.config.get<string>('INTERNAL_SERVICE_TOKEN'), {
      'Content-Type': 'application/json',
    });
  }

  /**
   * @returns true if upstream accepted the trigger; false if skipped/unavailable.
   */
  async trigger(input: {
    userId: string;
    workflowId: string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<boolean> {
    const base = this.baseUrl();
    if (!base) {
      this.logger.debug(
        `skip trigger ${input.workflowId} → ${input.userId}: NOTIFICATIONS_URL unset`,
      );
      return false;
    }

    try {
      const res = await fetch(`${base}/internal/v1/notifications/trigger`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          userId: input.userId,
          workflowId: input.workflowId,
          payload: input.payload ?? {},
          idempotencyKey: input.idempotencyKey,
        }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.warn(
          `notifications trigger ${res.status} for ${input.userId}: ${detail.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `notifications unavailable (${input.workflowId}): ${
          error instanceof Error ? error.message : error
        }`,
      );
      return false;
    }
  }
}
