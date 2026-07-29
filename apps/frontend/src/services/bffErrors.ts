import { applyHardLockFromResponse } from '@/services/hardLock';
import { applyUnauthorizedReauthFromResponse } from '@/services/sessionReauth';

/** Apply hard-lock / stale-token side effects from a BFF error body (non-consuming). */
export function inspectBffAuthFailure(status: number, body: unknown): void {
  applyHardLockFromResponse(status, body);
  applyUnauthorizedReauthFromResponse(status, body);
}
